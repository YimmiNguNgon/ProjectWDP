import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Separator } from './ui/separator';
import { Link } from 'react-router-dom';
import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  const { signUp } = useAuth();

  const handleSubmit = async () => {
    try {
      await signUp(username, password);
      toast.info('Sign up successfully', {
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
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <Separator />
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
            <FieldLabel htmlFor='password'>Password</FieldLabel>
            <Password
              id='password'
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
        </FieldGroup>
      </CardContent>
      <Separator />
      <CardFooter>
        <FieldGroup>
          <Field>
            <Button onClick={handleSubmit}>Create Account</Button>
            <Button variant='outline' type='button'>
              Sign up with Google
            </Button>
            <FieldDescription className='px-6 text-center'>
              Already have an account? <Link to={'/auth/sign-in'}>Sign in</Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </CardFooter>
    </Card>
  );
}
