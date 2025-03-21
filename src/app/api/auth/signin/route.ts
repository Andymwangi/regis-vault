import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { db } from "@/lib/db/db";
import { users, activityLogs } from "@/server/db/schema/schema";
import { eq, sql } from "drizzle-orm";
import { sendOtpEmail } from "@/lib/auth/email";
import { getRedisInstance } from "@/lib/redis/redis";

// Schema validation for sign-in form
const signInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const result = signInSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: result.error.errors },
        { status: 400 }
      );
    }
    
    const { email, password } = result.data;
    
    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    
    if (!user) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }
    
    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { message: "Invalid email or password" },
        { status: 401 }
      );
    }
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in Redis with 10-minute expiration
    const redis = await getRedisInstance();
    await redis.set(`otp:${user.id}`, otp, { ex: 600 });
    
    // Send OTP via email
    await sendOtpEmail(email, otp);
    
    // Log sign-in attempt
    await db.insert(activityLogs).values({
      userId: sql`${user.id}::integer`,
      action: "SIGN_IN_ATTEMPT",
      details: "User attempted to sign in and OTP was sent",
    });
    
    return NextResponse.json(
      { 
        message: "OTP has been sent to your email",
        userId: user.id
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Sign-in error:", error);
    return NextResponse.json(
      { message: "Authentication failed" },
      { status: 500 }
    );
  }
}