import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/appwrite";
import { fullConfig } from "@/lib/appwrite/config";
import { Query } from "node-appwrite";
import { setCookie } from "@/lib/appwrite/cookie-utils";
import { ID } from "node-appwrite";

export async function GET(request: NextRequest) {
  // Get the token from the URL
  const token = request.nextUrl.searchParams.get("token");
  const redirectTo = request.nextUrl.searchParams.get("redirect") || "/dashboard/files";
  
  if (!token) {
    console.error("Magic link error: Missing token");
    return NextResponse.redirect(new URL("/sign-in?error=missing-token", request.url));
  }
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as {
      userId: string;
      email: string;
      purpose: string;
    };
    
    console.log("Magic link token verified:", { email: decoded.email, purpose: decoded.purpose });
    
    // Check if the token is for magic link authentication
    if (decoded.purpose !== "magic-link") {
      console.error("Magic link error: Invalid token purpose:", decoded.purpose);
      return NextResponse.redirect(new URL("/sign-in?error=invalid-token", request.url));
    }
    
    // Get user information
    const { databases } = await createAdminClient();
    const result = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      [Query.equal("email", [decoded.email])]
    );
    
    if (result.total === 0) {
      console.error("Magic link error: User not found with email:", decoded.email);
      return NextResponse.redirect(new URL("/sign-in?error=user-not-found", request.url));
    }
    
    const user = result.documents[0];
    console.log("User found:", { id: user.$id, email: user.email, role: user.role });
    
    // Create a session cookie
    const sessionToken = jwt.sign(
      { 
        id: user.$id, 
        email: user.email,
        accountId: user.accountId,
        role: user.role
      },
      process.env.JWT_SECRET || "fallback-secret",
      { expiresIn: "7d" }
    );
    
    // Create response with redirect to the dashboard or requested URL
    const redirectUrl = new URL(redirectTo, request.url);
    console.log(`Magic link callback: Redirecting to ${redirectUrl.href}`);

    const response = NextResponse.redirect(redirectUrl);
    
    // Set the session cookie on the response with proper options
    const cookieMaxAge = 60 * 60 * 24 * 7; // 7 days
    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      maxAge: cookieMaxAge,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
    
    console.log("Cookie set:", {
      name: "session",
      value: `${sessionToken.substring(0, 10)}...`,
      maxAge: cookieMaxAge,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
    
    // Create or get user settings
    const settingsResult = await databases.listDocuments(
      fullConfig.databaseId,
      fullConfig.userSettingsCollectionId,
      [Query.equal("userId", [user.$id])]
    );

    let settings;
    if (settingsResult.total === 0) {
      // Create default settings if they don't exist
      settings = await databases.createDocument(
        fullConfig.databaseId,
        fullConfig.userSettingsCollectionId,
        ID.unique(),
        {
          userId: user.$id,
          theme: "system",
          preferences: JSON.stringify({
            language: "en",
            timezone: "UTC",
            dateFormat: "MM/DD/YYYY",
            notifications: { email: true, push: true }
          }),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
    } else {
      settings = settingsResult.documents[0];
    }

    // Update the user's last login timestamp
    await databases.updateDocument(
      fullConfig.databaseId,
      fullConfig.usersCollectionId,
      user.$id,
      {
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        accountId: user.accountId,
        department: user.department,
        role: user.role,
        status: user.status,
        theme: settings.theme,
        updatedAt: new Date().toISOString()
      }
    );
    
    return response;
  } catch (error) {
    console.error("Magic link error:", error);
    return NextResponse.redirect(new URL("/sign-in?error=invalid-token", request.url));
  }
} 