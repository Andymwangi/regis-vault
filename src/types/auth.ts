import { DefaultSession } from "next-auth";

export type UserRole = "admin" | "user" | "manager";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  department: string;
  role: UserRole;
  status: "active" | "pending" | "suspended";
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SignUpData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  department: string;
  role: UserRole;
  password: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface OTPVerificationData {
  userId: string;
  otp: string;
}

// Extend the built-in session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      firstName: string;
      lastName: string;
      department: string;
      emailVerified: boolean;
      phoneNumber: string;
      avatarUrl?: string;
      createdAt: Date;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    department: string;
    emailVerified: boolean;
  }
}
