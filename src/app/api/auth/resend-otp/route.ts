import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/db";
import { users, activityLogs } from "@/server/db/schema/schema";
import { eq } from "drizzle-orm";
import { getRedisInstance } from "@/lib/redis/redis";
import { sendOtpEmail } from "@/lib/auth/email";

const resendOtpSchema = z.object({
  userId: z.string(),
  type: z.enum(['signin', 'signup']).default('signin'),
});

export async function POST(req: Request) {
  try {
    const { userId, type } = await req.json();

    // Validate input
    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Redis with 10-minute expiration
    const redis = await getRedisInstance();
    const key = type === 'signin' ? `otp:${userId}` : `verification:${userId}`;
    await redis.set(key, otp, { ex: 600 });

    // Send OTP via email
    await sendOtpEmail(user.email, otp);

    // Log OTP resend
    await db.insert(activityLogs).values({
      userId,
      action: "OTP_RESENT",
      details: "User requested a new verification code",
    });

    return NextResponse.json({
      message: "New verification code sent",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { message: "Failed to send new verification code" },
      { status: 500 }
    );
  }
}