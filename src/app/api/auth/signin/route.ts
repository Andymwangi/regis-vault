import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/db";
import { users, activityLogs } from "@/server/db/schema/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { getRedisInstance } from "@/lib/redis/redis";
import { sendOtpEmail } from "@/lib/auth/email";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Sign-in attempt received:', {
      email: body.email,
      hasPassword: !!body.password,
      passwordLength: body.password?.length
    });

    // Validate input
    const result = signInSchema.safeParse(body);
    if (!result.success) {
      console.log('Validation failed:', result.error);
      return NextResponse.json(
        { message: "Invalid email or password format" },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      with: {
        department: true,
      },
    });

    if (!user) {
      console.log('User not found for email:', email);
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log('Invalid password for user:', user.id);
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if user is active
    if (user.status !== 'active') {
      console.log('Inactive user attempt:', user.id);
      return NextResponse.json(
        { message: "Account is not active. Please verify your email first." },
        { status: 403 }
      );
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      // Store OTP in Redis with 10-minute expiration
      const redis = await getRedisInstance();
      await redis.set(`otp:${user.id}`, otp, { ex: 600 });

      // Send OTP via email
      await sendOtpEmail(user.email, otp);

      // Log the sign-in attempt
      await db.insert(activityLogs).values({
        userId: user.id,
        action: "SIGN_IN_ATTEMPT",
        details: "User attempted to sign in and OTP was sent",
      });

      console.log('Sign-in initiated successfully for user:', user.id);

      // Return success with userId (needed for OTP verification)
      return NextResponse.json({
        message: "Verification code sent",
        userId: user.id,
      });
    } catch (error) {
      console.error("Failed to send verification code:", error);
      
      // Log the failure
      await db.insert(activityLogs).values({
        userId: user.id,
        action: "EMAIL_SEND_FAILED",
        details: "Failed to send verification code email",
      });
      
      return NextResponse.json(
        { message: "Failed to send verification code. Please try again." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Sign-in error:", error);
    return NextResponse.json(
      { message: "An error occurred during sign-in" },
      { status: 500 }
    );
  }
}