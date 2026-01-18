import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./ui/button";
import { LogOut, User } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

export default function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/auth/sign-in");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={"link"} className="p-0 h-fit cursor-pointer uppercase">
          {user.username}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="mt-2 p-4 w-56 flex flex-col gap-2"
      >
        <div className="flex flex-row gap-2 items-center">
          <div className="aspect-square h-12 rounded-full bg-muted border border-border" />
          <DropdownMenuLabel className="capitalize font-bold text-xl">
            {user.username}
          </DropdownMenuLabel>
        </div>
        <DropdownMenuSeparator />
        <Link to="/profile">
          <Button className="w-full cursor-pointer" variant={"outline"} size={"lg"}>
            <User />
            <span>My Profile</span>
          </Button>
        </Link>
        <Button className="cursor-pointer" variant={"destructive"} size={"lg"} onClick={handleLogout}>
          <LogOut />
          <span>Sign Out</span>
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
