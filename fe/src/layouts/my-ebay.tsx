import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";

import BuyingSidebar from "./BuyingSidebar";

export default function MyEbayLayout() {
  const { pathname } = useLocation();
  const paths = pathname.split("/");
  const isMessagesPage = pathname === "/my-ebay/messages";
  const activitySubRoutes = new Set([
    "activity",
    "messages",
    "feedback-requests",
    "saved-searches",
    "saved-sellers",
  ]);

  // Map routes to tabs
  const getTabFromPath = () => {
    if (!paths.includes("my-ebay")) return "activity";
    const section = paths[paths.indexOf("my-ebay") + 1] || "activity";
    if (activitySubRoutes.has(section)) {
      return "activity";
    }
    return "activity";
  };

  const [value, setValue] = React.useState(getTabFromPath());
  const navigate = useNavigate();

  React.useEffect(() => {
    // Sync current tab with URL path segment if it changes
    const newTab = getTabFromPath();

    if (newTab !== value) {
      setValue(newTab);
    }

    // Redirect if we are exactly at /my-ebay
    if (pathname === '/my-ebay' || pathname === '/my-ebay/') {
      navigate('/my-ebay/activity/purchases', { replace: true });
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

  // Messages should use full workspace without surrounding My eBay tabs/sidebar.
  if (isMessagesPage) {
    return <Outlet />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">My EFPT</h1>
      <div className="flex gap-8 mt-2">
        <BuyingSidebar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
