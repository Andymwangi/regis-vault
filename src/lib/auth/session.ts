"use server";

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { getCookie } from "@/lib/appwrite/cookie-utils";

export interface SessionUser {
  id: string;
  accountId: string;
  email: string;
  role: string;
}

/**
 * Get the current user session from the cookie
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const sessionCookie = await getCookie("session");
    if (!sessionCookie) return null;

    const decoded = jwt.verify(
      sessionCookie,
      process.env.JWT_SECRET || "fallback-secret"
    ) as SessionUser;

    return decoded;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

/**
 * Create a new session for the user
 */
export async function createSession(user: {
  id: string;
  accountId: string;
  email: string;
  role: string;
}): Promise<string> {
  // Create the JWT token
  const token = jwt.sign(
    user,
    process.env.JWT_SECRET || "fallback-secret",
    { expiresIn: "7d" }
  );

  // Store it in a cookie (done outside this function in the API route)
  return token;
}

/**
 * Helper function to require authentication
 * Use this in server components/actions that need authentication
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  
  if (!session) {
    throw new Error("Authentication required");
  }
  
  return session;
} 