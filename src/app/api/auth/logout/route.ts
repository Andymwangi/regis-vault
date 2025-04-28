import { NextRequest, NextResponse } from "next/server";
import { deleteCookie } from "@/lib/appwrite/cookie-utils";

export async function POST(request: NextRequest) {
  try {
    // Delete the session cookie
    await deleteCookie("session");
    
    // Create a response
    const response = NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 }
    );
    
    // Also clear the cookie from the response
    response.cookies.delete("session");
    
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to log out" },
      { status: 500 }
    );
  }
} 