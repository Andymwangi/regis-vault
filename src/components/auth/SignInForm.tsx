'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  otp: z.string().length(6, {
    message: "Verification code must be 6 digits",
  }).optional(),
});

export function SignInForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpField, setShowOtpField] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      otp: "",
    },
    mode: "onChange",
  });

  // Add form state logging
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      console.log('Form field changed:', { name, type, value });
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Handle countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('Form submitted with values:', {
      email: values.email,
      password: values.password ? '***' : 'empty',
      showOtpField,
      hasOtp: !!values.otp
    });
    
    if (!values.password) {
      toast.error("Password is required", {
        description: "Please enter your password",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (showOtpField && values.otp) {
        console.log('Attempting OTP verification with:', {
          otp: values.otp,
          userId: userId
        });
        
        // First verify OTP
        const verifyResponse = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            otp: values.otp, 
            userId,
            type: 'signin'
          }),
        });

        const verifyData = await verifyResponse.json();
        console.log('OTP verification response:', {
          status: verifyResponse.status,
          data: verifyData
        });

        if (!verifyResponse.ok) {
          throw new Error(verifyData.message || "Verification failed");
        }

        // After OTP verification, perform the actual sign in with NextAuth
        console.log('Attempting NextAuth sign-in with credentials');
        const signInResult = await signIn("credentials", {
          email: values.email,
          password: values.password,
          action: "signin",
          otp: values.otp,
          redirect: false,
        });

        console.log('Final NextAuth sign-in result:', signInResult);

        if (signInResult?.error) {
          throw new Error(signInResult.error);
        }

        toast.success("Successfully signed in!", {
          description: "Welcome back to Regis Vault",
        });

        // Redirect to dashboard
        console.log('Redirecting to dashboard');
        router.push("/dashboard/files");
        router.refresh();
      } else {
        console.log('Attempting initial sign-in with email:', values.email);
        
        // First try our custom sign-in endpoint to handle OTP
        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
          }),
        });

        const data = await response.json();
        console.log('Sign-in API response:', {
          status: response.status,
          data: data
        });

        if (!response.ok) {
          throw new Error(data.message || "Failed to initiate sign-in");
        }

        setUserId(data.userId);
        setShowOtpField(true);
        setTimeLeft(60); // Start countdown for resend
        toast.success("Verification code sent!", {
          description: "Please check your email for the code",
        });
      }
    } catch (error) {
      console.error("Authentication error:", {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error,
        state: {
          showOtpField,
          userId,
          email: values.email
        }
      });
      
      toast.error("Authentication Failed", {
        description: error instanceof Error ? error.message : "Please try again",
      });

      // Reset form if there's an error during OTP verification
      if (showOtpField) {
        form.setValue("otp", "");
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Handle OTP resend with logging
  const handleResendOtp = async () => {
    if (!userId || timeLeft > 0) {
      console.log('Resend OTP blocked:', { userId, timeLeft });
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Attempting to resend OTP for userId:', userId);
      
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          type: 'signin'
        }),
      });
      
      const data = await response.json();
      console.log('Resend OTP response:', {
        status: response.status,
        data: data
      });
      
      if (response.ok) {
        setTimeLeft(60); // Reset countdown
        toast.success("New code sent!", {
          description: "Please check your email for the new verification code",
        });
      } else {
        throw new Error(data.message || "Failed to resend verification code");
      }
    } catch (error) {
      console.error("Resend code error:", {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error,
        userId
      });
      
      toast.error("Failed to Resend Code", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-[400px] border-red-100">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
        <CardDescription>
          {showOtpField 
            ? "Enter the verification code sent to your email" 
            : "Sign in to your account"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input 
                      type="email"
                      placeholder="example@orpp.com" 
                      {...field} 
                      disabled={showOtpField}
                      className={cn(
                        "border-red-100 focus-visible:ring-red-200",
                        showOtpField && "opacity-50"
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="••••••" 
                      {...field} 
                      disabled={showOtpField}
                      className={cn(
                        "border-red-100 focus-visible:ring-red-200",
                        showOtpField && "opacity-50"
                      )}
                      autoComplete="current-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {showOtpField && (
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input 
                        type="text"
                        placeholder="000000" 
                        maxLength={6}
                        className="text-center text-2xl tracking-[0.5em] border-red-100 focus-visible:ring-red-200"
                        {...field} 
                        autoComplete="one-time-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Button 
              type="submit" 
              className="w-full bg-red-500 hover:bg-red-600" 
              disabled={isLoading}
            >
              {isLoading 
                ? "Processing..." 
                : showOtpField 
                  ? "Verify Code" 
                  : "Sign In"
              }
            </Button>
            {showOtpField && (
              <Button
                type="button"
                variant="link"
                onClick={handleResendOtp}
                disabled={timeLeft > 0 || isLoading}
                className="w-full text-red-500 hover:text-red-600"
              >
                {timeLeft > 0
                  ? `Resend code in ${timeLeft}s`
                  : "Resend verification code"
                }
              </Button>
            )}
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <div className="flex flex-col items-center w-full gap-2">
          <div className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Button 
              variant="link" 
              onClick={() => router.push("/sign-up")} 
              disabled={isLoading}
              className="text-red-500 hover:text-red-600 p-0"
            >
              Sign up
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}