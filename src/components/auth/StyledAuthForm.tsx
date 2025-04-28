'use client';

import { useRouter } from "next/navigation";
import AuthForm from "@/components/auth/AuthForm";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type FormType = "sign-in" | "sign-up";

export function StyledAuthForm({ type }: { type: FormType }) {
  const router = useRouter();
  
  const title = type === "sign-in" ? "Welcome back" : "Create an account";
  const description = type === "sign-in" 
    ? "Sign in to your account" 
    : "Enter your information to create an account";
  
  return (
    <Card className="w-[400px] border-red-100">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="auth-form-wrapper">
          <AuthForm type={type} />
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex flex-col items-center w-full gap-2">
          <div className="text-sm text-gray-600">
            {type === "sign-in" ? "Don't have an account?" : "Already have an account?"}{' '}
            <Button 
              variant="link" 
              onClick={() => router.push(type === "sign-in" ? "/sign-up" : "/sign-in")} 
              className="text-red-500 hover:text-red-600 p-0"
            >
              {type === "sign-in" ? "Sign up" : "Sign in"}
            </Button>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            <Button 
              variant="link" 
              onClick={() => router.push("/")} 
              className="text-gray-500 hover:text-gray-600 p-0"
            >
              ← Back to welcome page
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
} 