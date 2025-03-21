import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db/db";
import { users, activityLogs } from "@/server/db/schema/schema";
import { eq, sql } from "drizzle-orm";
import { sendOtpEmail } from "@/lib/auth/email";
import { getRedisInstance } from "@/lib/redis/redis";
import { authOptions } from "@/lib/auth/auth-options";

export async function POST(request: NextRequest) {
  try {
    // Get user ID from session or request body
    let userId;
    const session = await getServerSession(authOptions);
    
    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      const body = await request.json();
      userId = body.userId;
      
      if (!userId) {
        return NextResponse.json(
          { message: "User ID is required" },
          { status: 400 }
        );
      }
    }
    
    // Get user details
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
    await redis.set(`otp:${userId}`, otp, { ex: 600 });
    
    // Send OTP via email
    await sendOtpEmail(user.email, otp);
    
    // Log OTP resend
    await db.insert(activityLogs).values({
      userId: sql`${userId}::integer`,
      action: "OTP_RESENT",
      details: "User requested a new OTP",
    });
    
    return NextResponse.json(
      { message: "OTP has been resent to your email" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { message: "Failed to resend OTP" },
      { status: 500 }
    );
  }
}