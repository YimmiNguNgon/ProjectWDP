import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Field,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Password } from '@/components/ui/password';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from 'axios';

const resetPasswordSchema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: ResetPasswordValues) => {
        if (!token) {
            toast.error('Invalid or missing reset token', {
                position: 'top-center',
                closeButton: true,
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/auth/reset-password`,
                {
                    token,
                    newPassword: data.password
                }
            );

            toast.success('Password reset successfully', {
                position: 'top-center',
                closeButton: true,
            });

            navigate('/auth/sign-in');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to reset password', {
                position: 'top-center',
                closeButton: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!token) {
        return (
            <div className={cn('flex flex-col gap-6', className)} {...props}>
                <Card>
                    <CardHeader>
                        <CardTitle>Invalid Reset Link</CardTitle>
                        <CardDescription>
                            The password reset link is invalid or has expired.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center space-y-4">
                            <Link to="/auth/forgot-password" className="text-primary hover:underline text-sm">
                                Request a new reset link
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col gap-6', className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Reset your password</CardTitle>
                    <CardDescription>
                        Enter your new password below.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor='password'>New Password</FieldLabel>
                                <Password
                                    id='password'
                                    {...register("password")}
                                />
                                {errors.password && (
                                    <p className="text-sm text-destructive">{errors.password.message}</p>
                                )}
                            </Field>
                            <Field>
                                <FieldLabel htmlFor='confirmPassword'>Confirm Password</FieldLabel>
                                <Password
                                    id='confirmPassword'
                                    {...register("confirmPassword")}
                                />
                                {errors.confirmPassword && (
                                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                                )}
                            </Field>
                            <Field>
                                <Button
                                    type='submit'
                                    className="w-full cursor-pointer"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Resetting...' : 'Reset Password'}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
