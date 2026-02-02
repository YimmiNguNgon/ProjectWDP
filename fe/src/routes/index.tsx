import { useRoutes } from "react-router-dom";

import HomePage from "@/pages/home";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import ProductsPage from "@/pages/products";
import ProductDetailPage from "@/pages/product-detail";
import VerifyEmailPage from "@/pages/verify-email";
import GoogleAuthSuccessPage from "@/pages/google-auth-success";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import UserManagement from "@/pages/admin/user-management";
import AdminDashboard from "@/pages/admin/dashboard";
import ProductManagement from "@/pages/admin/product-management";
import FeedbackManagement from "@/pages/admin/feedback-management";
import PermissionsPage from "@/pages/admin/permissions-page";

import { MainLayout } from "@/layouts/main";
import AuthLayout from "@/layouts/auth";
import UserProfilePage from "@/pages/profile";
import AdminLayout from "@/layouts/admin";
import PurchaseHistoryPage from "@/pages/purchases/purchase-history-page";
import WatchlistPage from "@/pages/purchases/watchlist-page";
import LeaveFeedbackPage from "@/pages/purchases/leave-feedback-page";
import FeatureUnderConstructionPage from "@/pages/feature-under-construction";
import MessagesPage from "@/pages/messages-page";
import MyListingsPage from "@/pages/seller/my-listings";
import InventoryPage from "@/pages/seller/inventory";
import SellerSoldPage from "@/pages/seller/seller-sold-page";
import PromotionRequestsPage from "@/pages/seller/promotion-requests";
import AdminPromotionRequestsPage from "@/pages/admin/promotion-requests";
import UnauthorizedPage from "@/pages/unauthorized";

import ProtectedRoute from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/RoleGuard";
import SellerLayout from "@/layouts/seller";
import SellerOverview from "@/pages/seller/Overview";
import SellerOrders from "@/pages/seller/Orders";
import SellerProducts from "@/pages/seller/Products";
import SellerRevenue from "@/pages/seller/Revenue";
import SellerReviews from "@/pages/seller/Reviews";
import MyEbayLayout from "@/layouts/my-ebay";

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
          element: <ProtectedRoute />,
          children: [
            {
              path: "profile",
              element: <UserProfilePage />,
            },
            // {
            //   path: "messages",
            //   element: <MessagesPage />,
            // },
          ],
        },
        {
          path: "products",
          element: <ProductsPage />,
        },
        {
          path: "products/:productId",
          element: <ProductDetailPage />,
        },
        {
          path: "my-ebay",
          element: <MyEbayLayout />,
          children: [
            {
              path: "activity/purchases",
              element: <PurchaseHistoryPage />,
            },
            {
              path: "activity/watchlist",
              element: <WatchlistPage />,
            },
            {
              path: "messages",
              element: <MessagesPage />,
            },
          ],
        },
        {
          path: "purchases/:orderId/feedback/:productId",
          element: <LeaveFeedbackPage />,
        },
        {
          path: "seller/my-listings",
          element: <MyListingsPage />,
        },
        {
          path: "seller/inventory",
          element: <InventoryPage />,
        },
        {
          path: "seller/sold",
          element: <SellerSoldPage />,
        },
        {
          path: "seller/promotion-requests",
          element: <PromotionRequestsPage />,
        },
      ],
    },
    {
      path: "/admin",
      element: (
        <RoleGuard requireRole="admin">
          <AdminLayout />
        </RoleGuard>
      ),
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
          path: "feedback",
          element: <FeedbackManagement />,
        },
        {
          path: "complaints",
          element: <AdminComplaints />,
        },
        {
          path: "reviews",
          element: <AdminReviews />,
        },
        {
          path: "promotion-requests",
          element: <AdminPromotionRequestsPage />,
        },
        {
          path: "permissions",
          element: <PermissionsPage />,
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
        // {
        //   path: "products/new",
        //   element: <SellerAddProduct />,
        // },
        // {
        //   path: "products/edit/:id",
        //   element: <SellerEditProduct />,
        // },
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
      path: "coming-soon",
      element: <FeatureUnderConstructionPage />,
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
        {
          path: "google/success",
          element: <GoogleAuthSuccessPage />,
        },
        {
          path: "forgot-password",
          element: <ForgotPasswordPage />,
        },
        {
          path: "reset-password",
          element: <ResetPasswordPage />,
        },
      ],
    },
    {
      path: "/unauthorized",
      element: <UnauthorizedPage />,
    },
  ]);
};
