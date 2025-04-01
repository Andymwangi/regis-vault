'use client'
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
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { account, verifyAppwriteSetup } from "@/lib/appwrite/config";
import { createAccountServer } from "@/lib/appwrite/server-actions";

// Updated schema with department and role
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }).max(32, {
    message: "Name must be less than 32 characters.",
  }).refine(value => /^[a-zA-Z0-9 ]+$/.test(value), {
    message: "Name can only contain letters, numbers, and spaces.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }).max(64, {
    message: "Email must be less than 64 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }).max(32, {
    message: "Password must be less than 32 characters.",
  }).refine(value => /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/.test(value), {
    message: "Password can only contain standard characters.",
  }),
  confirmPassword: z.string(),
  department: z.string({
    required_error: "Please select a department.",
  }).refine(value => departments.includes(value), {
    message: "Please select a valid department.",
  }),
  role: z.enum(["admin", "manager", "user"], {
    required_error: "Please select a role.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// List of departments
const departments = [
  "Human Resources",
  "Finance",
  "Information Technology",
  "Legal",
  "Operations",
  "Marketing",
  "Research"
];

export function SignUpForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [setupIssues, setSetupIssues] = useState<string[]>([]);

  // Check Appwrite setup on component mount
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const { isValid, issues } = await verifyAppwriteSetup();
        if (!isValid) {
          setSetupIssues(issues);
          console.error("Appwrite setup issues:", issues);
        }
      } catch (error) {
        console.error("Error verifying Appwrite setup:", error);
      }
    };
    
    checkSetup();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      department: "",
      role: "user",
    },
    mode: "onChange",
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Sign-up submission:", values);
    
    // If there are setup issues, show a message and don't proceed
    if (setupIssues.length > 0) {
      toast.error("Appwrite Setup Issues", {
        description: "Please check console for details or contact administrator.",
      });
      console.error("Appwrite setup issues:", setupIssues);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use the server-side account creation to bypass guest permission issues
      const result = await createAccountServer(
        values.email,
        values.password,
        values.name,
        values.department,
        values.role
      );
      
      // Login the user after server-side account creation
      try {
        await account.createSession(values.email, values.password);
      } catch (sessionError) {
        console.warn("Session creation failed, user may need to log in manually:", sessionError);
        // Continue anyway since account was created
      }
      
      // If successful, show success message
      toast.success("Account created successfully!", {
        description: "You will be redirected to the dashboard",
      });
      
      // Redirect to the appropriate dashboard based on the role
      let redirectPath = "/dashboard/files";
      if (values.role === "admin") {
        redirectPath = "/dashboard/admin";
      }
      
      router.push(redirectPath);
      router.refresh();
    } catch (error) {
      console.error("Sign-up error:", error);
      
      // Handle specific error cases
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("already exists")) {
        toast.error("Account already exists", {
          description: "Please try signing in instead or use a different email address",
        });
      } else if (errorMessage.includes("Invalid") && errorMessage.includes("userId")) {
        toast.error("Appwrite Configuration Issue", {
          description: "Please check your Appwrite setup and permissions",
        });
        console.error("Appwrite userId error. Verify your Appwrite configuration and permissions.");
      } else {
        toast.error("Sign-up Failed", {
          description: errorMessage || "Please try again",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-[500px] border-red-100">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
        <CardDescription>Enter your information to create an account</CardDescription>
      </CardHeader>
      {setupIssues.length > 0 && (
        <div className="mx-6 my-2 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <h3 className="text-amber-800 font-bold mb-2">Appwrite Configuration Issues</h3>
          <ul className="list-disc pl-5 text-sm text-amber-700">
            {setupIssues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-600">
            Please share these details with your administrator.
          </p>
        </div>
      )}
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="John Doe" 
                      {...field} 
                      className="border-red-100 focus-visible:ring-red-200"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="border-red-100 focus-visible:ring-red-200">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="border-red-100 focus-visible:ring-red-200">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="••••••" 
                      {...field} 
                      className="border-red-100 focus-visible:ring-red-200"
                      autoComplete="new-password"
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
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter>
        <div className="text-sm text-gray-600 w-full text-center">
          Already have an account?{' '}
          <Button 
            variant="link" 
            onClick={() => router.push("/sign-in")} 
            disabled={isLoading}
            className="text-red-500 hover:text-red-600 p-0"
          >
            Sign in
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}