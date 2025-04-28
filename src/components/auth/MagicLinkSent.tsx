import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

interface MagicLinkSentProps {
  email: string;
  type: "sign-in" | "sign-up";
  onReset: () => void;
}

const MagicLinkSent = ({ email, type, onReset }: MagicLinkSentProps) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 text-center">
      <div className="rounded-full bg-green-50 p-3">
        <Mail className="h-8 w-8 text-green-600" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl font-bold">Check your email</h3>
        <p className="text-gray-600">
          We've sent a magic link to <span className="font-medium text-gray-800">{email}</span>
        </p>
        <p className="text-sm text-gray-500">
          Click the link in your email to {type === "sign-in" ? "sign in" : "complete your registration"}
        </p>
      </div>
      
      <div className="border-t border-gray-100 pt-4 w-full">
        <p className="text-sm text-gray-500 mb-4">
          {type === "sign-in" 
            ? "Didn't receive an email? Check your spam folder or try again." 
            : "Once registered, you'll be able to sign in using the same email."}
        </p>
        
        <Button
          variant="outline"
          className="mt-2"
          onClick={onReset}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {type === "sign-in" ? "sign in" : "sign up"}
        </Button>
      </div>
    </div>
  );
};

export default MagicLinkSent; 