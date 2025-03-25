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
import { sendWelcomeEmail } from "@/lib/auth/email";

// Types for sign-up form data
interface SignUpData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  department: string;
  role: "admin" | "manager" | "user";
  password: string;
}

// Extended user type to include our custom fields
interface CustomUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "manager" | "user";
  departmentId: string | null;
  department: string;
  requiresOtp?: boolean;
  emailVerified: Date | null;
}

declare module "next-auth" {
  interface User extends CustomUser {}
  interface Session {
    user: CustomUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends CustomUser {}
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db) as any,
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
        action: { label: "Action", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials, req): Promise<any> {
        if (!credentials?.email || !credentials?.password || !credentials?.action) {
          throw new Error("Missing required credentials");
        }

        try {
          // Find user
          const user = await db.query.users.findFirst({
            where: eq(users.email, credentials.email),
            with: {
              department: true,
            },
          });

          if (!user) {
            throw new Error("No user found with this email address");
          }

          // Verify password
          const passwordMatch = await bcrypt.compare(credentials.password, user.password);
          if (!passwordMatch) {
            throw new Error("Invalid email or password");
          }

          // If OTP is provided, verify it
          if (credentials.otp) {
            const redis = await getRedisInstance();
            const storedOtp = await redis.get(`otp:${user.id}`);
            
            if (!storedOtp || storedOtp !== credentials.otp) {
              throw new Error("Invalid verification code");
            }
            
            // Clear the OTP after successful verification
            await redis.del(`otp:${user.id}`);
            
            // Log successful verification
            await db.insert(activityLogs).values({
              userId: user.id,
              action: "OTP_VERIFIED",
              details: "User successfully verified OTP",
            });
          }

          // Return user object
          return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            departmentId: user.departmentId,
            department: user.department?.name ?? '',
            emailVerified: user.status === 'active' ? new Date() : null,
          } as CustomUser;
        } catch (error) {
          console.error("Authorization error:", error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as CustomUser).role;
        token.firstName = (user as CustomUser).firstName;
        token.lastName = (user as CustomUser).lastName;
        token.departmentId = (user as CustomUser).departmentId;
        token.department = (user as CustomUser).department;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "manager" | "user";
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.departmentId = token.departmentId as string;
        session.user.department = token.department as string;
      }
      return session;
    },
  },
};

// Helper function to handle sign-in process
async function handleSignIn(email: string, password: string): Promise<CustomUser | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    with: {
      department: true,
    },
  });

  if (!user) {
    throw new Error("No user found with this email address");
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  
  if (!passwordMatch) {
    throw new Error("Invalid email or password");
  }

  // Generate and send OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  try {
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
  } catch (error) {
    console.error('Error during sign-in process:', error);
    throw new Error("Failed to send verification code. Please try again.");
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    departmentId: user.departmentId,
    department: user.department?.name ?? '',
    requiresOtp: true,
    emailVerified: user.status === 'active' ? new Date() : null,
  } as CustomUser;
}

// Helper function to handle sign-up process
async function handleSignUp(data: SignUpData): Promise<CustomUser | null> {
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
    where: eq(departments.id, data.department),
  });
  
  if (!departmentExists) {
    throw new Error("Selected department does not exist");
  }

  try {
    // Create new user
    const [newUser] = await db.insert(users).values({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: hashedPassword,
      departmentId: data.department,
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
    
    // Send welcome email
    await sendWelcomeEmail(newUser.email, `${newUser.firstName} ${newUser.lastName}`);
    
    // Log user creation
    await db.insert(activityLogs).values({
      userId: newUser.id,
      action: "ACCOUNT_CREATED",
      details: `New user account created and welcome email sent`,
    });

    return {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      departmentId: newUser.departmentId,
      department: departmentExists.name,
      requiresOtp: true,
      emailVerified: null,
    } as CustomUser;
  } catch (error) {
    console.error('Error during sign-up process:', error);
    throw new Error("Failed to create account. Please try again.");
  }
}

// API route to handle OTP verification
export async function verifyOtp(userId: string, otp: string): Promise<boolean> {
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
export async function verifyAccount(userId: string, otp: string): Promise<boolean> {
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
export async function resendOtp(userId: string): Promise<boolean> {
  try {
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
  } catch (error) {
    console.error('Error during OTP resend:', error);
    return false;
  }
}