import { Link } from "react-router-dom";
import { ShieldX, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setAuthToken } from "@/lib/axios";

export default function BannedPage() {
  const handleSignOut = () => {
    setAuthToken(null);
    window.location.href = "/auth/sign-in";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldX className="h-10 w-10 text-red-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Account Banned</h1>
          <p className="text-gray-600">
            Your account has been banned and you do not have permission to access this platform.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex items-start gap-3 text-left">
          <Mail className="h-5 w-5 mt-0.5 flex-shrink-0 text-blue-600" />
          <div>
            <p className="font-semibold mb-1">How to submit a ban appeal</p>
            <p>Sign in again with your account credentials. A ban appeal link will be sent to your registered email address.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleSignOut}>
            Sign In to Request Appeal
          </Button>
          <Button variant="outline" asChild>
            <Link to="/help-contact">Contact Support</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
