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
import { Password } from './ui/password';
import { Link, useNavigate } from 'react-router-dom';
import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

export function SignInForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleSubmit = async () => {
    try {
      await signIn(username, password);
      navigate('/');
      toast.info('Sign in successfully', {
        position: 'top-center',
        closeButton: true,
      });
    } catch {
      toast.error('Invalid username or password', {
        position: 'top-center',
        closeButton: true,
      });
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor='username'>Username</FieldLabel>
              <Input
                id='username'
                type='text'
                placeholder='Enter your username'
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>
            <Field>
              <div className='flex items-center'>
                <FieldLabel htmlFor='password'>Password</FieldLabel>
                <a
                  href='#'
                  className='ml-auto inline-block text-sm underline-offset-4 hover:underline'
                >
                  Forgot your password?
                </a>
              </div>
              <Password
                required
                id='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {/* <Input id='password' type='password' required /> */}
            </Field>
            <Field>
              <Button type='submit' onClick={handleSubmit}>
                Login
              </Button>
              <Button variant='outline' type='button'>
                Login with Google
              </Button>
              <FieldDescription className='text-center'>
                Don&apos;t have an account?{' '}
                <Link to='/auth/sign-up'>Sign up</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  );
}
