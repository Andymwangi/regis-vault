import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Shield, Users, ArrowRight } from "lucide-react";

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Welcome to{" "}
            <span className="text-red-500">Regis Vault</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your secure document management system for efficient file sharing and collaboration across departments.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="border-red-100 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-red-500" />
              </div>
              <CardTitle>Secure File Management</CardTitle>
              <CardDescription>
                Upload, store, and manage your documents with enterprise-grade security.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-red-100 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-red-500" />
              </div>
              <CardTitle>Role-Based Access</CardTitle>
              <CardDescription>
                Control document access with department-based permissions and user roles.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-red-100 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-red-500" />
              </div>
              <CardTitle>Team Collaboration</CardTitle>
              <CardDescription>
                Share and collaborate on documents within your department seamlessly.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              Ready to get started?
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Sign in to your account or create a new one to begin managing your documents.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button
                asChild
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-6 text-lg"
              >
                <Link href="/sign-in">
                  Sign In
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-red-200 text-red-500 hover:bg-red-50 px-8 py-6 text-lg"
              >
                <Link href="/sign-up">
                  Create Account
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 