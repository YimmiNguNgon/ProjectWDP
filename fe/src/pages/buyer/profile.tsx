import { useState, useEffect } from "react";
import { UserProfile } from "@/components/user-profile";
import { useAuth } from "@/hooks/use-auth";
import api from "@/lib/axios";

export default function UserProfilePage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/orders');
        // Transform backend orders to match UserProfile component format
        const formattedOrders = response.data.data?.map((order: any) => ({
          id: order._id,
          orderNumber: order.orderNumber || `ORD-${order._id.slice(-6)}`,
          date: new Date(order.createdAt).toLocaleDateString('en-GB'),
          total: order.totalAmount,
          status: order.status,
          items: order.items?.length || 0,
        })) || [];
        setOrders(formattedOrders);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        setOrders([]); // Empty orders on error
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchOrders();
    }
  }, [user]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">User Profile</h1>
        <p className="text-gray-600 mt-2">
          Manage your personal information and view your order history.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      ) : (
        user && <UserProfile user={user} orders={orders} />
      )}
    </div>
  );
}
