// src/lib/auth/auth-options.ts
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { db } from "@/lib/db/db";
import { users, departments, activityLogs } from "@/server/db/schema/schema";
import { eq, and } from "drizzle-orm";
import { sendOtpEmail } from "@/lib/auth/email";
import { getRedisInstance } from "@/lib/redis/redis";

// Types for sign-up form data
interface SignUpData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  department: string;
  role: string;
  password: string;
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/otp-verification",
    newUser: "/sign-up",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        action: { label: "Action", type: "text" }, // 'signin' or 'signup'
        firstName: { label: "First Name", type: "text" },
        lastName: { label: "Last Name", type: "text" },
        phoneNumber: { label: "Phone Number", type: "text" },
        department: { label: "Department", type: "text" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.action) {
          return null;
        }

        if (credentials.action === "signup") {
          return await handleSignUp(credentials as unknown as SignUpData);
        } else {
          return await handleSignIn(credentials.email, credentials.password);
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
        token.department = (user as any).department;
        token.requiresOtp = (user as any).requiresOtp;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        session.user.department = token.department;
      }
      return session;
    },
  },
};

// Helper function to handle sign-in process
async function handleSignIn(email: string, password: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    throw new Error("No user found with this email address");
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  
  if (!passwordMatch) {
    throw new Error("Invalid email or password");
  }

  // Generate and send OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store OTP in Redis with 10-minute expiration
  const redis = await getRedisInstance();
  await redis.set(`otp:${user.id}`, otp, { ex: 600 });
  
  // Send OTP via email
  await sendOtpEmail(user.email, otp);
  
  // Log sign-in activity
  await db.insert(activityLogs).values({
    userId: user.id,
    action: "SIGN_IN_ATTEMPT",
    details: `User attempted to sign in and OTP was sent`,
  });

  return {
    id: user.id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    department: user.department,
    requiresOtp: true,
  };
}

// Helper function to handle sign-up process
async function handleSignUp(data: SignUpData) {
  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });

  if (existingUser) {
    throw new Error("Email already in use");
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(data.password, 10);
  
  // Check if department exists
  const departmentExists = await db.query.departments.findFirst({
    where: eq(departments.name, data.department),
  });
  
  if (!departmentExists) {
    throw new Error("Selected department does not exist");
  }

  // Create new user
  const [newUser] = await db.insert(users).values({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    passwordHash: hashedPassword,
    phoneNumber: data.phoneNumber,
    department: data.department,
    role: data.role,
    status: "pending", // User requires email verification
  }).returning();

  if (!newUser) {
    throw new Error("Failed to create user");
  }

  // Generate and send OTP for email verification
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store OTP in Redis with 10-minute expiration
  const redis = await getRedisInstance();
  await redis.set(`verification:${newUser.id}`, otp, { ex: 600 });
  
  // Send OTP via email
  await sendOtpEmail(newUser.email, otp);
  
  // Log user creation
  await db.insert(activityLogs).values({
    userId: newUser.id,
    action: "ACCOUNT_CREATED",
    details: `New user account created`,
  });

  return {
    id: newUser.id.toString(),
    email: newUser.email,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    role: newUser.role,
    department: newUser.department,
    requiresOtp: true,
  };
}

// API route to handle OTP verification
export async function verifyOtp(userId: number, otp: string): Promise<boolean> {
  const redis = await getRedisInstance();
  const storedOtp = await redis.get(`otp:${userId}`);
  
  if (storedOtp === otp) {
    // Clear the OTP after successful verification
    await redis.del(`otp:${userId}`);
    
    // Log successful verification
    await db.insert(activityLogs).values({
      userId,
      action: "OTP_VERIFIED",
      details: "User successfully verified OTP",
    });
    
    return true;
  }
  
  return false;
}

// API route to handle account verification (for new sign-ups)
export async function verifyAccount(userId: number, otp: string): Promise<boolean> {
  const redis = await getRedisInstance();
  const storedOtp = await redis.get(`verification:${userId}`);
  
  if (storedOtp === otp) {
    // Clear the OTP after successful verification
    await redis.del(`verification:${userId}`);
    
    // Update user status to active
    await db.update(users)
      .set({ status: "active" })
      .where(eq(users.id, userId));
    
    // Log successful account verification
    await db.insert(activityLogs).values({
      userId,
      action: "ACCOUNT_VERIFIED",
      details: "User successfully verified their account",
    });
    
    return true;
  }
  
  return false;
}

// API route to handle OTP resend
export async function resendOtp(userId: number): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  
  if (!user) {
    return false;
  }
  
  // Generate new OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store OTP in Redis with 10-minute expiration
  const redis = await getRedisInstance();
  await redis.set(`otp:${userId}`, otp, { ex: 600 });
  
  // Send OTP via email
  await sendOtpEmail(user.email, otp);
  
  // Log OTP resend
  await db.insert(activityLogs).values({
    userId,
    action: "OTP_RESENT",
    details: "User requested a new OTP",
  });
  
  return true;
}