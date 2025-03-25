import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/db";
import { users, activityLogs } from "@/server/db/schema/schema";
import { eq } from "drizzle-orm";
import { getRedisInstance } from "@/lib/redis/redis";
import { sign } from "jsonwebtoken";

const verifyOtpSchema = z.object({
  otp: z.string().length(6),
  userId: z.string(),
  type: z.enum(['signin', 'signup']).default('signin'),
});

export async function POST(req: Request) {
  try {
    const { userId, otp, type } = await req.json();

    // Validate input
    if (!userId || !otp) {
      return NextResponse.json(
        { message: "User ID and OTP are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        department: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Get Redis instance
    const redis = await getRedisInstance();
    
    // Get stored OTP based on type
    const key = type === 'signin' ? `otp:${userId}` : `verification:${userId}`;
    const storedOtp = await redis.get(key);

    if (!storedOtp || storedOtp !== otp) {
      // Log failed verification
      await db.insert(activityLogs).values({
        userId,
        action: "OTP_VERIFICATION_FAILED",
        details: "Invalid or expired verification code",
      });

      return NextResponse.json(
        { message: "Invalid or expired verification code" },
        { status: 401 }
      );
    }

    // Clear the OTP
    await redis.del(key);

    // If this is account verification, update user status
    if (type === 'verification') {
      await db.update(users)
        .set({ status: 'active' })
        .where(eq(users.id, userId));
    }

    // Log successful verification
    await db.insert(activityLogs).values({
      userId,
      action: type === 'signin' ? "SIGN_IN_OTP_VERIFIED" : "ACCOUNT_VERIFIED",
      details: "User successfully verified OTP",
    });

    // Generate JWT token
    const token = sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        departmentId: user.departmentId,
        department: user.department?.name ?? ''
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "1d" }
    );
    
    // Set the token in a secure HTTP-only cookie
    const response = NextResponse.json(
      { 
        message: "Verification successful",
        verified: true,
        role: user.role,
        status: user.status
      },
      { status: 200 }
    );
    
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
    });
    
    return response;
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { message: "An error occurred during verification" },
      { status: 500 }
    );
  }
}