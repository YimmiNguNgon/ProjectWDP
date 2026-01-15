import * as React from 'react';
import { Input } from './input';
import { Button } from './button';
import { Eye, EyeOff } from 'lucide-react';

function Password({ ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className='relative'>
      <Input type={showPassword ? 'text' : 'password'} {...props} />
      <Button
        type='button'
        variant={'ghost'}
        size={'icon'}
        className='absolute right-0 top-1/2 transform -translate-y-1/2'
        onClick={() => setShowPassword((prev) => !prev)}
      >
        {showPassword ? (
          <EyeOff className='h-4 w-4' />
        ) : (
          <Eye className='h-4 w-4' />
        )}
      </Button>
    </div>
  );
}

export { Password };
