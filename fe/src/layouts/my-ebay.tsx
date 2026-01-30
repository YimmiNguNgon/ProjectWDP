import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";

import BuyingSidebar from "./BuyingSidebar";

export default function MyEbayLayout() {
  const { pathname } = useLocation();
  const paths = pathname.split("/");
  // Handle case where path is just /my-ebay, defaulting to activity
  const current =
    paths.length > 2 && paths.includes("my-ebay")
      ? paths[paths.indexOf("my-ebay") + 1]
      : "activity";

  const [value, setValue] = React.useState(current);
  const navigate = useNavigate();

  React.useEffect(() => {
    // Sync current tab with URL path segment if it changes
    const newTab =
      paths.length > 2 && paths.includes("my-ebay")
        ? paths[paths.indexOf("my-ebay") + 1]
        : "activity";

    if (newTab !== value) {
      setValue(newTab);
    }
  }, [pathname]);

  const handleTabChange = (newValue: string) => {
    setValue(newValue);
    if (newValue === "activity") {
      navigate("/my-ebay/activity/purchases");
    } else {
      navigate(`/my-ebay/${newValue}`);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">My EFPT</h1>
      <Tabs value={value} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start border-b p-0 h-auto bg-transparent">
          <TabsTrigger
            value="activity"
            className="border text-md border-b-2 cursor-pointer border-transparent data-[state=active]:text-black data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            Buying
          </TabsTrigger>
          <TabsTrigger
            value="selling"
            className="border text-md border-b-2 cursor-pointer border-transparent data-[state=active]:text-black data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            Selling
          </TabsTrigger>
          <TabsTrigger
            value="messages"
            className="border text-md border-b-2 cursor-pointer border-transparent data-[state=active]:text-black data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            Messages
          </TabsTrigger>
          <TabsTrigger
            value="account"
            className="border text-md border-b-2 cursor-pointer border-transparent data-[state=active]:text-black data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            Account
          </TabsTrigger>
        </TabsList>
        <TabsContent value="activity" className="m-0">
          <div className="flex gap-8 mt-6">
            <BuyingSidebar />
            <main className="flex-1">
              <Outlet />
            </main>
          </div>
        </TabsContent>
        <TabsContent value="selling" className="m-0">
          <Outlet />
        </TabsContent>
        <TabsContent value="messages" className="m-0">
          <Outlet />
        </TabsContent>
        <TabsContent value="account" className="m-0">
          <Outlet />
        </TabsContent>
      </Tabs>
    </div>
  );
}
