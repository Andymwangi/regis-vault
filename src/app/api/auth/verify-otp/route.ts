import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db/db";
import { users, activityLogs } from "@/server/db/schema/schema";
import { eq, sql } from "drizzle-orm";
import { getRedisInstance } from "@/lib/redis/redis";
import { authOptions } from "@/lib/auth/auth-options";

// Schema validation for OTP verification
const otpSchema = z.object({
  otp: z.string().length(6),
  userId: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const result = otpSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: result.error.errors },
        { status: 400 }
      );
    }
    
    const { otp, userId: requestUserId } = result.data;
    
    // Determine user ID from session or request
    let userId;
    const session = await getServerSession(authOptions);
    
    if (session?.user?.id) {
      userId = session.user.id;
    } else if (requestUserId) {
      userId = requestUserId;
    } else {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Verify OTP
    const redis = await getRedisInstance();
    const storedOtp = await redis.get(`otp:${userId}`);
    
    if (!storedOtp || storedOtp !== otp) {
      return NextResponse.json(
        { message: "Invalid OTP code" },
        { status: 400 }
      );
    }
    
    // Clear OTP after successful verification
    await redis.del(`otp:${userId}`);
    
    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId.toString()),
      columns: {
        role: true,
      },
    });
    
    // Log successful verification
    await db.insert(activityLogs).values({
      userId: sql`${userId}::integer`,
      action: "OTP_VERIFIED",
      details: "User successfully verified OTP",
    });
    
    return NextResponse.json(
      { 
        message: "OTP verified successfully",
        role: user?.role
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { message: "Verification failed" },
      { status: 500 }
    );
  }
}