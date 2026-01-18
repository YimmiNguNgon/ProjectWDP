import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  uploadImageToCloudinary,
  updateUserProfile,
  updateUserEmail,
  changeUserPassword,
} from "@/api/user";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export interface UserProfileProps {
  user: {
    username: string;
    email: string;
    avatarUrl?: string;
  };
  orders?: Array<{
    id: string;
    orderNumber: string;
    date: string;
    total: number;
    status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
    items: number;
  }>;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function UserProfile({ user, orders = [] }: UserProfileProps) {
  const { fetchMe } = useAuth();
  const [editEmail, setEditEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(user.email);
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [newUsername, setNewUsername] = useState(user.username);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    user.avatarUrl,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const handleUpdateEmail = async () => {
    if (!newEmail || newEmail === user.email) {
      setEditEmail(false);
      return;
    }

    try {
      setLoading(true);
      await updateUserEmail(newEmail);
      await fetchMe();
      setEditEmail(false);
      toast.success("Email has been updated successfully!");
    } catch (error) {
      console.error("Error updating email:", error);
      toast.error("Update failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    try {
      setLoading(true);
      await changeUserPassword(oldPassword, newPassword);
      await fetchMe();
      setChangePassOpen(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password has been changed successfully");
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(
        "Failed to change password. Please check your current password.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Kiểm tra kích thước file (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size exceeds 5MB limit");
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async () => {
    if (!newUsername.trim()) {
      alert("Tên người dùng không thể trống");
      return;
    }

    try {
      setLoading(true);
      let uploadedAvatarUrl = avatarPreview;

      // Nếu có ảnh mới, upload lên Cloudinary
      if (avatarFile) {
        uploadedAvatarUrl = await uploadImageToCloudinary(avatarFile);
      }

      // Update profile với username và avatar URL
      await updateUserProfile({
        username: newUsername,
        avatarUrl: uploadedAvatarUrl,
      });

      // Refresh user data từ backend
      await fetchMe();

      setEditProfileOpen(false);
      setAvatarFile(null);
      toast.success("Your profile has been updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEditProfile = () => {
    setEditProfileOpen(false);
    setNewUsername(user.username);
    setAvatarPreview(user.avatarUrl);
    setAvatarFile(null);
  };

  return (
    <div className="w-full">
      {/* Section 1: Avatar & User Info */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Avatar className="w-36 h-36">
                <AvatarImage src={user.avatarUrl} alt={user.username} />
                <AvatarFallback className="bg-[#AAED56] text-[#324E0F] font-bold text-2xl">
                  {user.username
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  {user.username}
                </h2>
                {/* <p className="text-gray-600 mt-1">ID: {user.id}</p> */}
              </div>
            </div>

            {/* Edit Profile Button */}
            <AlertDialog
              open={editProfileOpen}
              onOpenChange={setEditProfileOpen}
            >
              <AlertDialogTrigger asChild>
                <Button className="bg-[#AAED56] text-[#324E0F] hover:bg-[#9CD845] cursor-pointer">
                  Update Profile
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogTitle>Update Profile</AlertDialogTitle>
                <AlertDialogDescription>
                  Update your username and avatar image.
                </AlertDialogDescription>

                <div className="space-y-6 py-4">
                  {/* Avatar Preview */}
                  <div className="flex justify-center">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={avatarPreview} alt={newUsername} />
                      <AvatarFallback className="bg-[#AAED56] text-[#324E0F] font-bold text-xl">
                        {newUsername
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Avatar Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="avatar-upload">Upload Avatar</Label>
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-gray-500">
                      Only accept: JPG, PNG, GIF (tối đa 5MB)
                    </p>
                  </div>

                  {/* Username */}
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Enter username"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <AlertDialogCancel
                    className="cursor-pointer"
                    onClick={handleCancelEditProfile}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="cursor-pointer"
                    onClick={handleUpdateProfile}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 2: Email & Password (Left) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Email Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!editEmail ? (
                <>
                  <div className="p-3 bg-gray-50 rounded-md text-gray-700">
                    {user.email}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full cursor-pointer"
                    onClick={() => setEditEmail(true)}
                  >
                    Change Email
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="new-email">New email</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter new email"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdateEmail}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? "Saving..." : "Saved Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditEmail(false);
                        setNewEmail(user.email);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Password Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Password</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertDialog
                open={changePassOpen}
                onOpenChange={setChangePassOpen}
              >
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full cursor-pointer">
                    Change Password
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogTitle>Change Password</AlertDialogTitle>
                  <AlertDialogDescription>
                    Enter your current password and a new password to change it.
                  </AlertDialogDescription>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="old-pass">Current Password</Label>
                      <Input
                        id="old-pass"
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-pass">New Password</Label>
                      <Input
                        id="new-pass"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-pass">Confirm Password</Label>
                      <Input
                        id="confirm-pass"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleChangePassword}
                      disabled={loading}
                    >
                      {loading ? "Saving..." : "Save Password"}
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Order History (Right) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>My Orders</CardTitle>
              <CardDescription>
                {orders.length > 0
                  ? `You have ${orders.length} orders`
                  : "You don't have any orders yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Not found Order</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            Order #{order.orderNumber}
                          </p>
                          <p className="text-sm text-gray-600">{order.date}</p>
                        </div>
                        <Badge className={statusColors[order.status]}>
                          {statusLabels[order.status]}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          {order.items} products
                        </p>
                        <p className="font-semibold text-lg text-gray-900">
                          {order.total.toLocaleString("vi-VN")} VNĐ
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
