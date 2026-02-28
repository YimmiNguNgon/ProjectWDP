import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Password } from "./ui/password";
import { Separator } from "./ui/separator";
import { Link, useNavigate } from "react-router-dom";
import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import LoadingAuth from "./loading-auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/axios";

const signUpSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignUpValues = z.infer<typeof signUpSchema>;
type Step = "form" | "pending";

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const [step, setStep] = React.useState<Step>("form");
  const [resendLoading, setResendLoading] = React.useState(false);
  const navigate = useNavigate();
  const { signUp, loading } = useAuth();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  const [countdown, setCountdown] = React.useState(0);

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResendEmail = async () => {
    try {
      setResendLoading(true);
      const email = getValues("email");
      const username = getValues("username");
      if (!email) return;

      await api.post("/api/auth/resend-email", { username, email });

      toast.success("Verification email sent successfully!");
      setCountdown(60); // Disable for 60 seconds
    } catch (error: any) {
      console.error("Failed to resend email:", error);
      toast.error(error.response?.data?.message || "Failed to resend email");
    } finally {
      setResendLoading(false);
    }
  };

  const onSubmit = async (data: SignUpValues) => {
    try {
      await signUp(data.username, data.email, data.password);
      toast.info("Check your email for verification", {
        position: "top-center",
        closeButton: true,
      });

      setStep("pending");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Invalid username or password",
        {
          position: "top-center",
          closeButton: true,
        },
      );
    }
  };

  if (loading) {
    return <LoadingAuth />;
  }

  if (step === "pending") {
    return (
      <Card {...props}>
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            We’ve sent a verification link to your email address.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="text-center space-y-3">
          <p>
            Please check your inbox and click the verification link to activate
            your account.
          </p>
          <p className="text-sm text-muted-foreground">
            If you don’t see the email, check your Spam folder.
          </p>

          <div className="pt-2">
            <p className="text-sm text-muted-foreground mb-2">
              Didn't receive the email?
            </p>
            <Button
              className="p-3 cursor-pointer h-auto font-normal"
              onClick={handleResendEmail}
              disabled={resendLoading ? true : countdown > 0}
            >
              {resendLoading
                ? "Sending"
                : countdown > 0
                  ? `Resend email in ${countdown}s`
                  : "Click to resend"}
            </Button>
          </div>
        </CardContent>
        <Separator />
        <CardFooter className="flex justify-center">
          <Button
            className="cursor-pointer"
            variant="outline"
            onClick={() => navigate("/auth/sign-in")}
          >
            Back to Sign in
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                {...register("username")}
              />
              {errors.username && (
                <p className="text-sm text-destructive">
                  {errors.username.message}
                </p>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Password id="password" {...register("password")} />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </Field>
          </FieldGroup>
          <Separator className="my-4" />
          <FieldGroup>
            <Field>
              <Button className="cursor-pointer w-full" type="submit">
                Create Account
              </Button>
              <Button
                className="cursor-pointer w-full"
                variant="outline"
                type="button"
                onClick={() => window.location.href = "http://localhost:8080/api/auth/google"}
              >
                Sign up with Google
              </Button>
              <FieldDescription className="px-6 text-center">
                Already have an account?{" "}
                <Link to={"/auth/sign-in"}>Sign in</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
