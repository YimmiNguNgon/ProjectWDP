import { SignInForm } from '@/components/sign-in-form';

export default function SignInPage() {
  return (
    <div className='flex h-full w-full items-center justify-center'>
      <div className='w-full max-w-sm'>
        <SignInForm />
      </div>
    </div>
  );
}
