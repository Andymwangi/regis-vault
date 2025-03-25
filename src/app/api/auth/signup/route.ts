import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { db } from "@/lib/db/db";
import { users, departments, activityLogs, userRoleEnum } from "@/server/db/schema/schema";
import { eq } from "drizzle-orm";
import { sendOtpEmail } from "@/lib/auth/email";
import { sendOtpEmailFallback } from "@/lib/auth/email-fallback";
import { getRedisInstance } from "@/lib/redis/redis";

// Schema validation for sign-up form
const signUpSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phoneNumber: z.string().min(10),
  department: z.string().uuid(), // Expect a UUID for department
  role: z.enum(['admin', 'manager', 'user']),
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

    // Verify department exists
    const departmentRecord = await db.query.departments.findFirst({
      where: eq(departments.id, department),
    });

    if (!departmentRecord) {
      return NextResponse.json(
        { message: "Selected department does not exist" },
        { status: 400 }
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
      role: role as 'admin' | 'manager' | 'user',
      status: "pending", // User requires email verification
    }).returning();
    
    // Generate OTP for email verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in Redis with 10-minute expiration
    const redis = await getRedisInstance();
    await redis.set(`verification:${newUser.id}`, otp, { ex: 600 });
    
    // Try to send OTP via email, but continue if it fails
    let emailSent = true;
    let fallbackUsed = false;
    
    try {
      console.log("Attempting to send OTP email via EmailJS...");
      await sendOtpEmail(email, otp);
      console.log("OTP email sent successfully via EmailJS");
    } catch (emailJsError) {
      console.error("EmailJS failed:", emailJsError);
      
      // Try fallback email service
      try {
        console.log("Attempting to send OTP email via fallback service...");
        await sendOtpEmailFallback(email, otp);
        console.log("OTP email sent successfully via fallback service");
        fallbackUsed = true;
      } catch (fallbackError) {
        console.error("Fallback email service failed:", fallbackError);
        emailSent = false;
      }
    }
    
    // Log user creation
    await db.insert(activityLogs).values({
      userId: newUser.id,
      action: "ACCOUNT_CREATED",
      details: fallbackUsed 
        ? "New user account created (fallback email used)"
        : "New user account created",
    });
    
    return NextResponse.json(
      { 
        message: emailSent 
          ? "Account created successfully. Please check your email for verification code."
          : "Account created successfully, but we couldn't send the verification email. Please use this code to verify your account.",
        userId: newUser.id,
        verificationCode: !emailSent ? otp : undefined // Only include the OTP if email failed
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Sign-up error:", error);
    return NextResponse.json(
      { message: "Failed to create account", error: String(error) },
      { status: 500 }
    );
  }
}