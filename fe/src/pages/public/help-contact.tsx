import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Clock3, FileQuestion, LifeBuoy, Mail, MessageCircle, PhoneCall, ShieldCheck, Truck } from "lucide-react";

const faqItems = [
  {
    q: "How do I track my order?",
    a: "Go to My efpt > Purchases to check shipping status and order timeline.",
  },
  {
    q: "How can I request a return or refund?",
    a: "Open your order details from Purchases and choose Return/Refund request with your reason.",
  },
  {
    q: "What if I cannot contact the seller?",
    a: "Use the Messages center. If no response, contact support below and include your order ID.",
  },
  {
    q: "Why was my account restricted?",
    a: "Restrictions are applied for security and policy reasons. Check email notifications and submit appeal if needed.",
  },
];

export default function HelpContactPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.username) setFullName(user.username);
    if (user?.email) setEmail(user.email);
  }, [user?.username, user?.email]);

  const canSubmit = useMemo(() => {
    return (
      fullName.trim().length >= 2 &&
      email.trim().includes("@") &&
      subject.trim().length >= 3 &&
      message.trim().length >= 10
    );
  }, [fullName, email, subject, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }

    try {
      setSubmitting(true);
      // Placeholder flow: keep UX ready while backend contact API is not defined.
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.success("Support request sent successfully. We will contact you soon.");
      setSubject("");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl py-8 px-4 space-y-6">
      <section className="rounded-2xl border bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Help & Contact</h1>
            <p className="text-gray-600 mt-2 max-w-2xl">
              Need support with orders, messages, policy, or account issues? Use the quick actions below or send us a request.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/my-ebay/activity/purchases">
              <Button variant="outline" className="gap-2">
                <Truck className="h-4 w-4" />
                Order Support
              </Button>
            </Link>
            <Link to="/my-ebay/messages">
              <Button variant="outline" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Messages
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-sky-600" />
              Support Time
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">Mon-Sun, 08:00 - 22:00 (UTC+7)</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-emerald-600" />
              Email
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">support@efpt.local</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-amber-600" />
              Hotline
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">1900 1234</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-violet-600" />
              Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">Security and account protection priority</CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-sky-600" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>Top support topics from buyers and sellers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {faqItems.map((item) => (
              <div key={item.q} className="rounded-lg border p-3">
                <p className="font-semibold">{item.q}</p>
                <p className="text-sm text-gray-600 mt-1">{item.a}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-emerald-600" />
              Contact Support
            </CardTitle>
            <CardDescription>Send details so support can assist faster</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    type="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Example: Order support #A1234"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail so support can help quickly."
                />
              </div>

              <Button type="submit" disabled={!canSubmit || submitting}>
                {submitting ? "Sending..." : "Send Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
