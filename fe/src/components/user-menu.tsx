import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

// Helper function để lấy display name từ username
const getDisplayName = (username: string): string => {
  // Loại bỏ phần số và gạch dưới ở cuối (ví dụ: NHACUTE7B_176874043955I -> NHACUTE7B)
  const name = username.split('_')[0].replace(/\d+$/g, '');
  return name || username;
};

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

  const displayName = getDisplayName(user.username);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={"link"} className="p-0 h-fit cursor-pointer uppercase">
          {displayName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="mt-2 p-4 w-56 flex flex-col gap-2"
      >
        <div
          className="flex flex-row gap-2 items-center cursor-pointer"
          onClick={() => navigate("/profile")}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-[#AAED56] text-[#324E0F] font-bold text-lg">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <DropdownMenuLabel className="capitalize font-bold text-xl">
            {displayName}
          </DropdownMenuLabel>
        </div>
        <DropdownMenuSeparator />
        <Button
          className="cursor-pointer"
          variant={"destructive"}
          size={"lg"}
          onClick={handleLogout}
        >
          <LogOut />
          <span>Sign Out</span>
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
