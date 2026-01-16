import { Loader2 } from "lucide-react";

const LoadingAuth = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-20 w-20 animate-spin text-primary" />
        <p className="text-md text-muted-foreground animate-pulse">Authenticating...</p>
      </div>
    </div>
  );
};

export default LoadingAuth;