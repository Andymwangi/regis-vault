import { SignUpForm } from "@/components/auth/SignUpForm";
import { AuthBanner } from "@/components/auth/AuthBanner";

export default function SignUpPage() {
  return (
    <div className="grid lg:grid-cols-2 min-h-screen">
      <AuthBanner />
      <div className="flex items-center justify-center p-8">
        <SignUpForm />
      </div>
    </div>
  );
}