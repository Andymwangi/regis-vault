import { SignInForm } from "@/components/auth/SignInForm";
import { AuthBanner } from "@/components/auth/AuthBanner";

export default function SignInPage() {
  return (
    <div className="grid lg:grid-cols-2 min-h-screen">
      <AuthBanner />
      <div className="flex items-center justify-center p-8">
        <SignInForm />
      </div>
    </div>
  );
}