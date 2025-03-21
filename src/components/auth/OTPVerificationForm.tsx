"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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

const formSchema = z.object({
  otp: z.string().length(6, {
    message: "OTP must be 6 characters",
  }),
});

export function OtpVerificationForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      otp: "",
    },
  });

  // Handle OTP resend
  const handleResendOtp = async () => {
    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
      });
      
      if (response.ok) {
        setTimeLeft(60);
        const countdownInterval = setInterval(() => {
          setTimeLeft((prevTime) => {
            if (prevTime <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prevTime - 1;
          });
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to resend OTP:", error);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      // Call your API to verify OTP
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Redirect based on user role
        if (data.role === 'admin') {
          router.push("/dashboard/admin");
        } else {
          router.push("/dashboard/files");
        }
      } else {
        const data = await response.json();
        throw new Error(data.message || "OTP verification failed");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      form.setError("otp", {
        message: "Invalid OTP code",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-[400px] mx-auto">
      <CardHeader>
        <CardTitle>OTP Verification</CardTitle>
        <CardDescription>
          We've sent a verification code to your email. Please enter it below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter 6-digit code" 
                      maxLength={6} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button 
          variant="link" 
          onClick={handleResendOtp} 
          disabled={timeLeft > 0}
        >
          {timeLeft > 0 
            ? `Resend code in ${timeLeft}s` 
            : "Resend verification code"}
        </Button>
      </CardFooter>
    </Card>
  );
}