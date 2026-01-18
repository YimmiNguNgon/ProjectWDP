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
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from 'axios';

const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    const onSubmit = async (data: ForgotPasswordValues) => {
        setIsSubmitting(true);
        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/auth/forgot-password`,
                { email: data.email }
            );

            setEmailSent(true);
            toast.success('Password reset link sent to your email', {
                position: 'top-center',
                closeButton: true,
            });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to send reset email', {
                position: 'top-center',
                closeButton: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (emailSent) {
        return (
            <div className={cn('flex flex-col gap-6', className)} {...props}>
                <Card>
                    <CardHeader>
                        <CardTitle>Check your email</CardTitle>
                        <CardDescription>
                            We've sent a password reset link to your email address.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Please check your inbox and click the link to reset your password.
                            </p>
                            <Link to="/auth/sign-in" className="text-primary hover:underline text-sm">
                                Back to Sign In
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
                    <CardTitle>Forgot your password?</CardTitle>
                    <CardDescription>
                        Enter your email address and we'll send you a link to reset your password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor='email'>Email</FieldLabel>
                                <Input
                                    id='email'
                                    type='email'
                                    placeholder='Enter your email'
                                    {...register("email")}
                                />
                                {errors.email && (
                                    <p className="text-sm text-destructive">{errors.email.message}</p>
                                )}
                            </Field>
                            <Field>
                                <Button
                                    type='submit'
                                    className="w-full cursor-pointer"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                                </Button>
                                <FieldDescription className='text-center'>
                                    Remember your password?{' '}
                                    <Link to='/auth/sign-in'>Sign in</Link>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
