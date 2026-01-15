import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

export default function MyEbayLayout() {
  const { pathname } = useLocation();
  const paths = pathname.split('/');
  const current = paths[paths.indexOf('my-ebay') + 1];

  const [value, setValue] = React.useState(current);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (value && value !== current) {
      navigate(`/my-ebay/${value}`);
    }
  }, [value, navigate, current]);

  return (
    <div className='flex flex-col gap-4'>
      <Tabs value={value} onValueChange={setValue}>
        <TabsList>
          <TabsTrigger value='activity'>
            Buying
          </TabsTrigger>
          <TabsTrigger value='selling'>
            Selling
          </TabsTrigger>
          <TabsTrigger value='messages'>
            Messages
          </TabsTrigger>
          <TabsTrigger value='account'>
            Account
          </TabsTrigger>
        </TabsList>
        <TabsContent value={value}>
          <Outlet />
        </TabsContent>
      </Tabs>
    </div>
  );
}
