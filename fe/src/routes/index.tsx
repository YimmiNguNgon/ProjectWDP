import { useRoutes } from "react-router-dom";

import HomePage from "@/pages/home";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import ProductsPage from "@/pages/products";
import ProductDetailPage from "@/pages/product-detail";
import VerifyEmailPage from "@/pages/verify-email";
import UserManagement from "@/pages/admin/user-management";
import AdminDashboard from "@/pages/admin/dashboard";
import ProductManagement from "@/pages/admin/product-management";

import { MainLayout } from "@/layouts/main";
import AuthLayout from "@/layouts/auth";
import UserProfilePage from "@/pages/profile";
import AdminLayout from "@/layouts/admin";
import SellerLayout from "@/layouts/seller";
import SellerOverview from "@/pages/seller/Overview";
import SellerOrders from "@/pages/seller/Orders";
import SellerRevenue from "@/pages/seller/Revenue";
import SellerReviews from "@/pages/seller/Reviews";
import SellerProducts from "@/pages/seller/Products";
import SellerAddProduct from "@/pages/seller/AddProduct";
import SellerEditProduct from "@/pages/seller/EditProduct";

// Placeholder components for admin pages
const AdminComplaints = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold mb-4">Admin Complaints</h1>
    <p className="text-gray-600">This page is under development.</p>
  </div>
);

const AdminReviews = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold mb-4">Review Moderation</h1>
    <p className="text-gray-600">This page is under development.</p>
  </div>
);

export const AppRouter = () => {
  return useRoutes([
    {
      path: "/",
      element: <MainLayout />,
      children: [
        {
          index: true,
          element: <HomePage />,
        },
        {
          path: "profile",
          element: <UserProfilePage />,
        },
        {
          path: "products",
          element: <ProductsPage />,
        },
        {
          path: "products/:productId",
          element: <ProductDetailPage />,
        },
      ],
    },
    {
      path: "/admin",
      element: <AdminLayout />,
      children: [
        {
          index: true,
          element: <AdminDashboard />,
        },
        {
          path: "users",
          element: <UserManagement />,
        },
        {
          path: "products",
          element: <ProductManagement />,
        },
        {
          path: "complaints",
          element: <AdminComplaints />,
        },
        {
          path: "reviews",
          element: <AdminReviews />,
        },
      ],
    },
    {
      path: "/seller",
      element: <SellerLayout />,
      children: [
        {
          index: true,
          element: <SellerOverview />,
        },
        {
          path: "orders",
          element: <SellerOrders />,
        },
        {
          path: "products",
          element: <SellerProducts />,
        },
        {
          path: "products/new",
          element: <SellerAddProduct />,
        },
        {
          path: "products/edit/:id",
          element: <SellerEditProduct />,
        },
        {
          path: "revenue",
          element: <SellerRevenue />,
        },
        {
          path: "reviews",
          element: <SellerReviews />,
        },
      ],
    },
    {
      path: "/verify-email",
      element: <VerifyEmailPage />,
    },
    {
      path: "/auth",
      element: <AuthLayout />,
      children: [
        {
          path: "sign-in",
          element: <SignInPage />,
        },
        {
          path: "sign-up",
          element: <SignUpPage />,
        },
      ],
    },
  ]);
};
