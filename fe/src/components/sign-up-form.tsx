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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import LoadingAuth from "./loading-auth";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/lib/axios";
import axios from "axios";

const signUpSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const staffSignUpSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  staffCode: z.string().min(1, "Staff code is required"),
  assignedProvince: z.string().min(1, "Please select your delivery area"),
});

type SignUpValues = z.infer<typeof signUpSchema>;
type StaffSignUpValues = z.infer<typeof staffSignUpSchema>;
type Step = "form" | "pending" | "staff-success";
type Mode = "normal" | "staff";

interface Province {
  code: number;
  name: string;
}

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const [step, setStep] = React.useState<Step>("form");
  const [mode, setMode] = React.useState<Mode>("normal");
  const [resendLoading, setResendLoading] = React.useState(false);
  const [provinces, setProvinces] = React.useState<Province[]>([]);
  const navigate = useNavigate();
  const { signUp, loading } = useAuth();

  React.useEffect(() => {
    axios
      .get("https://provinces.open-api.vn/api/p/1?depth=2")
      .then((res) => setProvinces(res.data.districts))
      .catch(() => {});
  }, []);

  const normalForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { username: "", email: "", password: "" },
  });

  const staffForm = useForm<StaffSignUpValues>({
    resolver: zodResolver(staffSignUpSchema),
    defaultValues: { username: "", email: "", password: "", staffCode: "", assignedProvince: "" },
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
      const email = normalForm.getValues("email");
      const username = normalForm.getValues("username");
      if (!email) return;

      await api.post("/api/auth/resend-email", { username, email });

      toast.success("Verification email sent successfully!");
      setCountdown(60);
    } catch (error: any) {
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
        { position: "top-center", closeButton: true },
      );
    }
  };

  const onStaffSubmit = async (data: StaffSignUpValues) => {
    try {
      await api.post("/api/auth/register", {
        username: data.username,
        email: data.email,
        password: data.password,
        role: "shipper",
        staffCode: data.staffCode,
        assignedProvince: data.assignedProvince,
      });
      toast.success("Staff account created! You can now sign in.", {
        position: "top-center",
        closeButton: true,
      });
      setStep("staff-success");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to create staff account",
        { position: "top-center", closeButton: true },
      );
    }
  };

  if (loading) {
    return <LoadingAuth />;
  }

  if (step === "staff-success") {
    return (
      <Card {...props}>
        <CardHeader>
          <CardTitle>Staff account created!</CardTitle>
          <CardDescription>
            Your shipper account is ready to use.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="text-center space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            You can now sign in with your credentials.
          </p>
        </CardContent>
        <Separator />
        <CardFooter className="flex justify-center">
          <Button
            className="cursor-pointer"
            onClick={() => navigate("/auth/sign-in")}
          >
            Go to Sign In
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === "pending") {
    return (
      <Card {...props}>
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            We've sent a verification link to your email address.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="text-center space-y-3">
          <p>
            Please check your inbox and click the verification link to activate
            your account.
          </p>
          <p className="text-sm text-muted-foreground">
            If you don't see the email, check your Spam folder.
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

      {/* Mode tabs */}
      <div className="px-6 pb-2">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setMode("normal")}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === "normal"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setMode("staff")}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === "staff"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Staff (Shipper)
          </button>
        </div>
      </div>

      <Separator />
      <CardContent>
        {mode === "normal" ? (
          <form onSubmit={normalForm.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  {...normalForm.register("username")}
                />
                {normalForm.formState.errors.username && (
                  <p className="text-sm text-destructive">
                    {normalForm.formState.errors.username.message}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...normalForm.register("email")}
                />
                {normalForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {normalForm.formState.errors.email.message}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Password id="password" {...normalForm.register("password")} />
                {normalForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {normalForm.formState.errors.password.message}
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
                  onClick={() =>
                    (window.location.href =
                      "http://localhost:8080/api/auth/google")
                  }
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
        ) : (
          <form onSubmit={staffForm.handleSubmit(onStaffSubmit)}>
            <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
              Staff registration requires a valid staff code provided by the
              administrator.
            </div>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="s-username">Username</FieldLabel>
                <Input
                  id="s-username"
                  type="text"
                  placeholder="Enter your username"
                  {...staffForm.register("username")}
                />
                {staffForm.formState.errors.username && (
                  <p className="text-sm text-destructive">
                    {staffForm.formState.errors.username.message}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="s-email">Email</FieldLabel>
                <Input
                  id="s-email"
                  type="email"
                  placeholder="Enter your email"
                  {...staffForm.register("email")}
                />
                {staffForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {staffForm.formState.errors.email.message}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="s-password">Password</FieldLabel>
                <Password
                  id="s-password"
                  {...staffForm.register("password")}
                />
                {staffForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {staffForm.formState.errors.password.message}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="staffCode">Staff Code</FieldLabel>
                <Input
                  id="staffCode"
                  type="password"
                  placeholder="Enter staff code"
                  {...staffForm.register("staffCode")}
                />
                {staffForm.formState.errors.staffCode && (
                  <p className="text-sm text-destructive">
                    {staffForm.formState.errors.staffCode.message}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel>Khu vực phụ trách</FieldLabel>
                <Controller
                  control={staffForm.control}
                  name="assignedProvince"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full cursor-pointer">
                        <SelectValue placeholder="Chọn tỉnh / thành phố" />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces.map((p) => (
                          <SelectItem key={p.code} value={p.name}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {staffForm.formState.errors.assignedProvince && (
                  <p className="text-sm text-destructive">
                    {staffForm.formState.errors.assignedProvince.message}
                  </p>
                )}
              </Field>
            </FieldGroup>
            <Separator className="my-4" />
            <FieldGroup>
              <Field>
                <Button
                  className="cursor-pointer w-full bg-orange-600 hover:bg-orange-700"
                  type="submit"
                >
                  Create Staff Account
                </Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account?{" "}
                  <Link to={"/auth/sign-in"}>Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
