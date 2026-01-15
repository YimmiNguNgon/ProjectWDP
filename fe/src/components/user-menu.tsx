import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';

export default function UserMenu() {
  const { payload, signOut } = useAuth();

  if (!payload) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={'link'} className='p-0 h-fit uppercase'>
          {payload.username}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='start'
        className='mt-2 p-4 w-56 flex flex-col gap-2'
      >
        <div className='flex flex-row gap-2 items-center'>
          <div className='aspect-square h-12 rounded-full bg-muted border border-border' />
          <DropdownMenuLabel className='capitalize font-bold text-xl'>
            {payload.username}
          </DropdownMenuLabel>
        </div>
        <DropdownMenuSeparator />
        <Button variant={'destructive'} size={'lg'} onClick={() => signOut()}>
          <LogOut />
          <span>Sign Out</span>
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
