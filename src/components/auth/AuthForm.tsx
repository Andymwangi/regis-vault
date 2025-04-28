"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { signInBridge, signUpBridge } from "@/lib/bridge/user-bridge";
import { logUserLogin } from "@/lib/bridge/activity-bridge";
import MagicLinkSent from "./MagicLinkSent";

type FormType = "sign-in" | "sign-up";

const authFormSchema = (formType: FormType) => {
  return z.object({
    email: z.string().email({
      message: "Please enter a valid email address.",
    }),
    fullName:
      formType === "sign-up"
        ? z.string().min(2, {
            message: "Full name must be at least 2 characters.",
          }).max(50, {
            message: "Full name must be less than 50 characters.",
          })
        : z.string().optional(),
  });
};

const AuthForm = ({ type }: { type: FormType }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  
  // Get redirect query parameter
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const formSchema = authFormSchema(type);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      console.log(`Submitting ${type} form with redirect to:`, redirectTo);
      
      const result =
        type === "sign-up"
          ? await signUpBridge(values.fullName || "", values.email, redirectTo)
          : await signInBridge(values.email, redirectTo);

      if (!result?.success) {
        setErrorMessage(result?.error || "Something went wrong. Please try again.");
        toast.error(result?.error || "Authentication failed");
        setIsLoading(false);
        return;
      }

      // Store the email for the magic link component
      setUserEmail(values.email);
      setIsSuccess(true);
      
      // Show success toast
      const message = result.message || 
        (type === "sign-up" 
          ? "Account created successfully!" 
          : "Sign-in link sent!");
      
      toast.success(message, {
        description: "Please check your email for verification instructions"
      });
      
      // Log login attempt
      if (type === "sign-in") {
        await logUserLogin();
      }
      
    } catch (error) {
      console.error("Auth error:", error);
      setErrorMessage("Authentication failed. Please try again.");
      toast.error("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset the form state
  const handleReset = () => {
    setIsSuccess(false);
    setErrorMessage("");
    form.reset();
  };

  return (
    <>
      {isSuccess ? (
        <MagicLinkSent 
          email={userEmail} 
          type={type}
          onReset={handleReset}
        />
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {type === "sign-up" && (
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your full name"
                        className="border-red-100 focus-visible:ring-red-200"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="example@orpp.com"
                      className="border-red-100 focus-visible:ring-red-200"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-red-500 hover:bg-red-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {type === "sign-in" ? "Signing in..." : "Signing up..."}
                </>
              ) : (
                type === "sign-in" ? "Sign In" : "Sign Up"
              )}
            </Button>

            {errorMessage && (
              <p className="text-sm text-red-500 text-center mt-2">
                {errorMessage}
              </p>
            )}
          </form>
        </Form>
      )}
    </>
  );
};

export default AuthForm;
