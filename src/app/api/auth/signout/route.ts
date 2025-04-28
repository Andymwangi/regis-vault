import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/lib/actions/auth";
import { deleteCookie } from "@/lib/appwrite/cookie-utils";

export async function GET(request: NextRequest) {
  try {
    // Use the server action to sign out
    await signOut();
    
    // Create a redirect response to the home page
    const response = NextResponse.redirect(new URL('/', request.url), {
      status: 303 // See Other
    });
    
    // Clear cookies in the response
    response.cookies.delete("appwrite-session");
    response.cookies.delete("session");
    
    return response;
  } catch (error) {
    console.error("Signout error:", error);
    // Even if there's an error, try to redirect to homepage
    return NextResponse.redirect(new URL('/', request.url), {
      status: 303 // See Other
    });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
} 