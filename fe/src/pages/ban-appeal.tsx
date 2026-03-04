import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { verifyBanAppealToken, submitBanAppeal } from "@/api/ban-appeals";
import { toast } from "sonner";

export default function BanAppealPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [valid, setValid] = useState(false);
  const [hasPendingAppeal, setHasPendingAppeal] = useState(false);
  const [username, setUsername] = useState("");
  const [banReason, setBanReason] = useState("");
  const [appealReason, setAppealReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setValid(false);
        setLoading(false);
        return;
      }
      try {
        const response = await verifyBanAppealToken(token);
        setValid(true);
        setUsername(response.data.username);
        setBanReason(response.data.banReason || "");
        setHasPendingAppeal(Boolean(response.data.hasPendingAppeal));
      } catch (error: any) {
        setValid(false);
        toast.error(error.response?.data?.message || "Invalid appeal link");
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async () => {
    if (!appealReason.trim()) {
      toast.error("Please provide your appeal reason");
      return;
    }
    setSubmitting(true);
    try {
      await submitBanAppeal(token, appealReason.trim());
      setSubmitted(true);
      toast.success("Appeal submitted successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit appeal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Account Ban Appeal</CardTitle>
          <CardDescription>
            Submit your explanation to admin for account review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-sm text-gray-500">Verifying appeal link...</p>}

          {!loading && !valid && (
            <Alert variant="destructive">
              <AlertTitle>Invalid link</AlertTitle>
              <AlertDescription>
                This appeal link is invalid or expired. Try signing in again to request a new link.
              </AlertDescription>
            </Alert>
          )}

          {!loading && valid && (
            <>
              <Alert>
                <AlertTitle>Banned account: {username}</AlertTitle>
                <AlertDescription>
                  {banReason ? `Ban reason: ${banReason}` : "No ban reason provided by admin."}
                </AlertDescription>
              </Alert>

              {hasPendingAppeal || submitted ? (
                <Alert>
                  <AlertTitle>Appeal already submitted</AlertTitle>
                  <AlertDescription>
                    Your appeal is pending review. Admin will review and notify you.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Textarea
                    rows={7}
                    placeholder="Write why you think this account should be restored..."
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSubmit} disabled={submitting}>
                      {submitting ? "Submitting..." : "Submit Appeal"}
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/auth/sign-in">Back to Sign In</Link>
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
