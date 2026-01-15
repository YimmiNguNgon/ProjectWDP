import { InputGroup, InputGroupAddon, InputGroupInput } from './input-group';
import { SearchIcon, XIcon } from 'lucide-react';
import { Button } from './button';
import React from 'react';

export function Search({ className, ...props }: React.ComponentProps<'input'>) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <InputGroup className={className}>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput ref={inputRef} {...props} />
      {inputRef.current?.value && (
        <InputGroupAddon align={'inline-end'}>
          <Button variant={'ghost'} size={'icon-sm'} className='p-0'>
            <XIcon />
          </Button>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
