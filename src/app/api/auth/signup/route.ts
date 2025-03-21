import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { db } from "@/lib/db/db";
import { users, activityLogs } from "@/server/db/schema/schema";
import { eq } from "drizzle-orm";
import { sendOtpEmail } from "@/lib/auth/email";
import { getRedisInstance } from "@/lib/redis/redis";

// Schema validation for sign-up form
const signUpSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phoneNumber: z.string().min(10),
  department: z.string(),
  role: z.string(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const result = signUpSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: result.error.errors },
        { status: 400 }
      );
    }
    
    const { firstName, lastName, email, phoneNumber, department, role, password } = result.data;
    
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    
    if (existingUser) {
      return NextResponse.json(
        { message: "Email already in use" },
        { status: 409 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const [newUser] = await db.insert(users).values({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      departmentId: department,
      role,
      status: "pending", // User requires email verification
    }).returning();
    
    // Generate OTP for email verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in Redis with 10-minute expiration
    const redis = await getRedisInstance();
    await redis.set(`verification:${newUser.id}`, otp, { ex: 600 });
    
    // Send OTP via email
    await sendOtpEmail(email, otp);
    
    // Log user creation
    await db.insert(activityLogs).values({
      userId: parseInt(newUser.id),
      action: "ACCOUNT_CREATED",
      details: "New user account created",
    });
    
    return NextResponse.json(
      { 
        message: "Account created successfully. Please check your email for verification code.",
        userId: newUser.id
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Sign-up error:", error);
    return NextResponse.json(
      { message: "Failed to create account" },
      { status: 500 }
    );
  }
}