import { Link } from "react-router-dom";
import { ShieldX } from "lucide-react";
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
            If you believe this is a mistake, you can submit a ban appeal.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/ban-appeal">Submit Ban Appeal</Link>
          </Button>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
