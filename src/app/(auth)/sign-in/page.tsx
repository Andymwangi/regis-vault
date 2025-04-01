'use client';

import { SignInForm } from "@/components/auth/SignInForm";
import { AuthBanner } from "@/components/auth/AuthBanner";
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
        <SignInForm />
      </div>
    </div>
  );
}