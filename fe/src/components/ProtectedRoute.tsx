import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const { accessToken, loading, user, refresh, fetchMe } = useAuth();
  const [starting, setStarting] = useState(true);

  const init = async () => {
    if (!accessToken) {
      await refresh();
    }

    // if (accessToken && !user) {
    //   await fetchMe();
    // }

    setStarting(false);
  };

  useEffect(() => {
    init();
  }, []);

  if (starting || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  return <Outlet></Outlet>;
};

export default ProtectedRoute;
