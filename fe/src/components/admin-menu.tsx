import { Link } from "react-router-dom";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ADMIN_MENU_ITEMS = [
    { label: "📊 Dashboard", to: "/admin" },
    { label: "👥 User Management", to: "/admin/users" },
    { label: "📦 Product Management", to: "/admin/products" },
    { label: "🛡️ Admin Complaints", to: "/admin/complaints" },
    { label: "⭐ Review Moderation", to: "/admin/reviews" },
];

function AdminMenu() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="font-medium text-sm outline-none text-red-600 hover:text-red-700">
                Admin Panel
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52 h-fit" align="end">
                {ADMIN_MENU_ITEMS.map((item) => (
                    <DropdownMenuItem key={item.label} asChild className="cursor-pointer">
                        <Link to={item.to}>{item.label}</Link>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
