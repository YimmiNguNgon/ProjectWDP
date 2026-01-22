import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  console.log(token)
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("error");
        return;
      }

      try {
        // Backend expects POST and uses req.query.token
        await api.post(`/api/auth/verify-email?token=${token}`);
        setStatus("success");
        toast.success("Email verified successfully!");
      } catch (error) {
        console.error("Verification failed", error);
        setStatus("error");
        toast.error("Verification failed or link expired.");
      }
    };

    if (status === "loading") {
      verify();
    }
  }, [token, status]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>
            {status === "loading" && "Verifying your email..."}
            {status === "success" && "Account verified!"}
            {status === "error" && "Verification failed"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {status === "loading" && (
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-16 w-16 text-green-500" />
              <p>Your email has been verified. You can now access all features.</p>
              <Button onClick={() => navigate("/auth/sign-in")}>
                Go to Sign In
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-destructive" />
              <p>The verification link is invalid or has expired.</p>
              <Button variant="outline" onClick={() => navigate("/auth/sign-in")}>
                Back to Sign In
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailPage;