'use client';

import { AuthBanner } from "@/components/auth/AuthBanner";
import { StyledAuthForm } from "@/components/auth/StyledAuthForm";
import { Suspense } from "react";

export default function SignUpPage() {
  return (
    <div className="grid lg:grid-cols-2 min-h-screen">
      <AuthBanner />
      <div className="flex items-center justify-center p-8">
        <Suspense fallback={<div>Loading...</div>}>
          <StyledAuthForm type="sign-up" />
        </Suspense>
      </div>
    </div>
  );
}