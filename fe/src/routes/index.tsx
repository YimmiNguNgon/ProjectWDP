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
import BanAppealPage from "@/pages/ban-appeal";
import HelpContactPage from "@/pages/help-contact";
import GiftCardsPage from "@/pages/gift-cards";
import UserManagement from "@/pages/admin/user-management";
import AdminDashboard from "@/pages/admin/dashboard";
import ProductManagement from "@/pages/admin/product-management";
import FeedbackManagement from "@/pages/admin/feedback-management";
import PermissionsPage from "@/pages/admin/permissions-page";
import CategoryManagement from "@/pages/admin/category-management";
import AdminAuditLogsPage from "@/pages/admin/audit-logs";

import { MainLayout, SocketProvider } from "@/layouts/main";
import { SocketContext } from "@/hooks/use-socket";
import AuthLayout from "@/layouts/auth";
import UserProfilePage from "@/pages/profile";
import AdminLayout from "@/layouts/admin";
import PurchaseHistoryPage from "@/pages/purchases/purchase-history-page";
import OrderDetailsPage from "@/pages/purchases/order-details-page";
import WatchlistPage from "@/pages/purchases/watchlist-page";
import LeaveFeedbackPage from "@/pages/purchases/leave-feedback-page";
import ReturnItemPage from "@/pages/purchases/return-item-page";
import FeatureUnderConstructionPage from "@/pages/feature-under-construction";
import MessagesPage from "@/pages/messages-page";
import MyListingsPage from "@/pages/seller/my-listings";
import InventoryPage from "@/pages/seller/inventory";
import SellerSoldPage from "@/pages/seller/seller-sold-page";
import PromotionRequestsPage from "@/pages/seller/promotion-requests";
import AdminPromotionRequestsPage from "@/pages/admin/promotion-requests";
import UnauthorizedPage from "@/pages/unauthorized";
import BecomeSellerPage from "@/pages/become-seller";
import SellerApplyPage from "@/pages/seller-apply";
import AdminSellerApplicationsPage from "@/pages/admin/seller-applications";

import ProtectedRoute from "@/components/ProtectedRoute";
import { RoleGuard } from "@/components/RoleGuard";
import SellerLayout from "@/layouts/seller";
import SellerOverview from "@/pages/seller/Overview";
import SellerOrders from "@/pages/seller/Orders";
import SellerProducts from "@/pages/seller/Products";
import SellerRefunds from "@/pages/seller/Refunds";
import AddProduct from "@/pages/seller/AddProduct";
import EditProduct from "@/pages/seller/EditProduct";
import SellerRevenue from "@/pages/seller/Revenue";
import SellerReviews from "@/pages/seller/Reviews";
import SellerTrustScorePage from "@/pages/seller/TrustScore";
import MyEbayLayout from "@/layouts/my-ebay";
import SellerFeedbackPage from "@/pages/seller/seller-feedback";
import FeedbackRevisionRequestPage from "@/pages/seller/feedback-revision-request";
import SellerFeedbackRequestsPage from "@/pages/seller/feedback-requests";
import BuyerFeedbackRequestsPage from "@/pages/buyer/feedback-requests";
import SavedSearchesPage from "@/pages/saved-searches-page";
import SavedSellersPage from "@/pages/saved-sellers-page";
import CartPage from "@/pages/buyer/cart";
import CheckoutPage from "@/pages/checkout";
import CheckoutSuccessPage from "@/pages/checkout-success";
import SellerVouchersPage from "@/pages/seller/vouchers";
import AdminVoucherRequestsPage from "@/pages/admin/voucher-requests";
import AdminGlobalVouchersPage from "@/pages/admin/vouchers-global";
import SellerInformationPage from "@/components/seller/seller-information";
import ShipperLayout from "@/layouts/shipper";
import ShipperDashboard from "@/pages/shipper/Dashboard";
import ShipperAvailableOrders from "@/pages/shipper/AvailableOrders";
import ShipperMyOrders from "@/pages/shipper/MyOrders";
import ShipperDisputes from "@/pages/shipper/Disputes";
import AdminShipperManagement from "@/pages/admin/shipper-management";
import AdminDeliveryReports from "@/pages/admin/delivery-reports";
import AdminOrders from "@/pages/admin/orders";

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
      element: (
        <SocketProvider>
          <MainLayout />
        </SocketProvider>
      ),
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
            {
              path: "/cart",
              element: <CartPage />,
            },
            {
              path: "/checkout",
              element: <CheckoutPage />,
            },
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
          path: "help-contact",
          element: <HelpContactPage />,
        },
        {
          path: "gift-cards",
          element: <GiftCardsPage />,
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
            {
              path: "feedback-requests",
              element: <BuyerFeedbackRequestsPage />,
            },
            {
              path: "saved-searches",
              element: <SavedSearchesPage />,
            },
            {
              path: "saved-sellers",
              element: <SavedSellersPage />,
            },
          ],
        },
        {
          path: "purchases/:orderId",
          element: <OrderDetailsPage />,
        },
        {
          path: "checkout/success",
          element: <CheckoutSuccessPage />,
        },
        {
          path: "purchases/:orderId/feedback/:productId",
          element: <LeaveFeedbackPage />,
        },
        {
          path: "purchases/:orderId/return",
          element: <ReturnItemPage />,
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
        {
          path: "become-seller",
          element: <BecomeSellerPage />,
        },
        {
          path: "become-seller/apply",
          element: <SellerApplyPage />,
        },
      ],
    },
    {
      path: "/admin",
      element: (
        <SocketProvider>
          <RoleGuard requireRole="admin">
            <AdminLayout />
          </RoleGuard>
        </SocketProvider>
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
          path: "categories",
          element: <CategoryManagement />,
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
          path: "voucher-requests",
          element: <AdminVoucherRequestsPage />,
        },
        {
          path: "global-vouchers",
          element: <AdminGlobalVouchersPage />,
        },
        {
          path: "permissions",
          element: <PermissionsPage />,
        },
        {
          path: "seller-applications",
          element: <AdminSellerApplicationsPage />,
        },
        {
          path: "audit-logs",
          element: <AdminAuditLogsPage />,
        },
        {
          path: "orders",
          element: <AdminOrders />,
        },
        {
          path: "shippers",
          element: <AdminShipperManagement />,
        },
        {
          path: "delivery-reports",
          element: <AdminDeliveryReports />,
        },
      ],
    },
    {
      path: "/shipper",
      element: (
        <SocketProvider>
          <RoleGuard requireRole="shipper">
            <ShipperLayout />
          </RoleGuard>
        </SocketProvider>
      ),
      children: [
        { index: true, element: <ShipperDashboard /> },
        { path: "available", element: <ShipperAvailableOrders /> },
        { path: "my-orders", element: <ShipperMyOrders /> },
        { path: "disputes", element: <ShipperDisputes /> },
      ],
    },
    {
      path: "/seller",
      element: (
        <SocketProvider>
          <SellerLayout />
        </SocketProvider>
      ),
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
          path: "refunds",
          element: <SellerRefunds />,
        },
        {
          path: "products",
          element: <SellerProducts />,
        },
        {
          path: "products/new",
          element: <AddProduct />,
        },
        {
          path: "products/edit/:id",
          element: <EditProduct />,
        },
        {
          path: "revenue",
          element: <SellerRevenue />,
        },
        {
          path: "trust-score",
          element: <SellerTrustScorePage />,
        },
        {
          path: "reviews",
          element: <SellerReviews />,
        },
        {
          path: "feedback",
          element: <SellerFeedbackPage />,
        },
        {
          path: "feedback-revision-request/:reviewId",
          element: <FeedbackRevisionRequestPage />,
        },
        {
          path: "feedback-requests",
          element: <SellerFeedbackRequestsPage />,
        },
        {
          path: "vouchers",
          element: <SellerVouchersPage />,
        },
      ],
    },
    {
      path: "/seller/:sellerId",
      element: <SellerInformationPage />,
    },
    {
      path: "/verify-email",
      element: <VerifyEmailPage />,
    },
    {
      path: "/ban-appeal",
      element: <BanAppealPage />,
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
