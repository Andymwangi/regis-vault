"use server";

import { cookies } from "next/headers";

/**
 * Get a cookie value
 * @param name Cookie name
 * @returns Cookie value or null if not found
 */
export async function getCookie(name: string): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(name);
    return cookie?.value || null;
  } catch (error) {
    console.error("Error getting cookie:", error);
    return null;
  }
}

/**
 * Set a cookie
 * @param name Cookie name
 * @param value Cookie value
 * @param expiresInSeconds Cookie expiration time in seconds (defaults to 30 days)
 */
export async function setCookie(
  name: string, 
  value: string, 
  expiresInSeconds: number = 60 * 60 * 24 * 30
): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set({
      name,
      value,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: expiresInSeconds,
      sameSite: "lax"
    });
  } catch (error) {
    console.error("Error setting cookie:", error);
  }
}

/**
 * Delete a cookie
 * @param name Cookie name
 */
export async function deleteCookie(name: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(name);
  } catch (error) {
    console.error("Error deleting cookie:", error);
  }
}

/**
 * Get the Appwrite session cookie
 * @returns Session cookie value or null if not found
 */
export async function getAppwriteSession(): Promise<string | null> {
  return getCookie("appwrite-session");
}

/**
 * Set the Appwrite session cookie
 * @param sessionValue Session value
 * @param expiresInSeconds Cookie expiration time in seconds (defaults to 2 weeks)
 */
export async function setAppwriteSession(
  sessionValue: string,
  expiresInSeconds: number = 60 * 60 * 24 * 14
): Promise<void> {
  await setCookie("appwrite-session", sessionValue, expiresInSeconds);
}

/**
 * Delete the Appwrite session cookie
 */
export async function deleteAppwriteSession(): Promise<void> {
  await deleteCookie("appwrite-session");
} 