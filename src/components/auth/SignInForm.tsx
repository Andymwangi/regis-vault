'use client';
import { useState } from "react";
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
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { account, getUserByEmail, sendOTP, verifyOTP } from "@/lib/appwrite/config";

// Form schema
const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  otp: z.string().optional(),
});

export function SignInForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      otp: "",
    },
    mode: "onChange",
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Sign-in attempt:", { email: values.email });
    
    setIsLoading(true);
    
    try {
      if (!isOtpSent) {
        // First step: Sign in and send OTP
        const session = await account.createSession(
          values.email,
          values.password
        );
        
        // Send OTP
        await sendOTP(values.email);
        setIsOtpSent(true);
        
        toast.success("OTP sent!", {
          description: "Please check your email for the verification code",
        });
      } else {
        // Second step: Verify OTP
        await verifyOTP(values.email, values.otp || "");
        
        // Get user profile information
        const user = await getUserByEmail(values.email);
        
        if (!user) {
          throw new Error("User profile not found");
        }
        
        toast.success("Successfully signed in!", {
          description: "Welcome back to Regis Vault",
        });
        
        // Redirect based on user role
        let redirectPath = "/dashboard/files";
        if (user.role === "admin") {
          redirectPath = "/dashboard/admin";
        }
        
        router.push(redirectPath);
        router.refresh();
      }
    } catch (error) {
      console.error("Authentication error:", error);
      
      toast.error("Authentication Failed", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-[400px] border-red-100">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
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
                      className="border-red-100 focus-visible:ring-red-200"
                      disabled={isOtpSent}
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
                      className="border-red-100 focus-visible:ring-red-200"
                      autoComplete="current-password"
                      disabled={isOtpSent}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isOtpSent && (
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input 
                        type="text"
                        placeholder="Enter 6-digit code" 
                        {...field} 
                        className="border-red-100 focus-visible:ring-red-200"
                        maxLength={6}
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
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isOtpSent ? "Verifying..." : "Signing in..."}
                </>
              ) : (
                isOtpSent ? "Verify Code" : "Sign In"
              )}
            </Button>
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
          <div className="text-sm text-gray-600 mt-2">
            <Button 
              variant="link" 
              onClick={() => router.push("/")} 
              disabled={isLoading}
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