import { cn } from '@/lib/utils';
import type { ComponentProps, PropsWithChildren } from 'react';

export function Container({
  children,
  className,
  ...props
}: PropsWithChildren<ComponentProps<'div'>>) {
  return (
    <div className={cn('container mx-auto px-4 ', className)} {...props}>
      {children}
    </div>
  );
}
