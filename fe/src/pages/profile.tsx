import { useState } from "react";
import { UserProfile } from "@/components/user-profile";
import { useAuth } from "@/hooks/use-auth";

export default function UserProfilePage() {
  const { user } = useAuth();

  // Mock orders data
  const [orders] = useState([
    {
      id: "1",
      orderNumber: "ORD-2024-001",
      date: "15/01/2024",
      total: 1500000,
      status: "delivered" as const,
      items: 3,
    },
    {
      id: "2",
      orderNumber: "ORD-2024-002",
      date: "12/01/2024",
      total: 890000,
      status: "shipped" as const,
      items: 2,
    },
    {
      id: "3",
      orderNumber: "ORD-2024-003",
      date: "10/01/2024",
      total: 2450000,
      status: "processing" as const,
      items: 5,
    },
    {
      id: "4",
      orderNumber: "ORD-2023-099",
      date: "05/12/2023",
      total: 550000,
      status: "delivered" as const,
      items: 1,
    },
  ]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">User Profile</h1>
        <p className="text-gray-600 mt-2">
          Manage your personal information and view your order history.
        </p>
      </div>

      {user && <UserProfile user={user} orders={orders} />}
    </div>
  );
}
