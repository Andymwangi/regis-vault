'use client';

import { AuthBanner } from "@/components/auth/AuthBanner";
import { StyledAuthForm } from "@/components/auth/StyledAuthForm";
import { useEffect } from "react";

export default function SignInPage() {
  // Add debugging to help track page rendering
  useEffect(() => {
    console.log("Sign-in page mounted");
    return () => console.log("Sign-in page unmounted");
  }, []);

  return (
    <div className="grid lg:grid-cols-2 min-h-screen">
      <AuthBanner />
      <div className="flex items-center justify-center p-8">
        <StyledAuthForm type="sign-in" />
      </div>
    </div>
  );
}