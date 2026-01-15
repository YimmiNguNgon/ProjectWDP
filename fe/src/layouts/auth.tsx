import { useAuth } from '@/hooks/use-auth';
import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';

function AuthLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  return (
    <div className='w-dvw h-dvh flex flex-col gap-8'>
      <header className='flex items-center justify-between h-18 border-b'>
        <Link
          to={'/'}
          className='container mx-auto px-4 flex items-center gap-4'
        >
          <img
            src='/ebay-logo-txt.png'
            alt='eBay Logo'
            className='h-10 w-auto'
          />
        </Link>
      </header>

      <main className='container mx-auto px-4 flex-1'>
        <Outlet />
      </main>

      <footer className='flex items-center justify-center p-4 border-t'>
        <span>© eBay 2025. All rights reserved.</span>
      </footer>
    </div>
  );
}

export default AuthLayout;
