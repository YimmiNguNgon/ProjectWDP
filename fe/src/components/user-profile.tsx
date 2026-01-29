import { useState, useEffect } from "react";
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
import { useAuth } from "@/hooks/use-auth";
import { changeUserPassword, createAddress, deleteAddress, getAddresses, setDefaultAddress, updateAddress, updateUserEmail, updateUserProfile, uploadImageToCloudinary, type Address } from "@/api/user";
import { useForm } from "react-hook-form";
import { changePasswordSchema, emailSchema, type ChangePasswordFormValues, type EmailFormValues } from "@/schema/user.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { MapIcon } from "lucide-react";
import AddressItems from "./address-items";
import AddressForm from "./address-form";
import { ConfirmDialog } from "./confirm-dialog";

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

export function UserProfile({ user }: UserProfileProps) {
  const { fetchMe } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [editEmail, setEditEmail] = useState(false);
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [newUsername, setNewUsername] = useState(user.username);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
    user.avatarUrl,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarKey, setAvatarKey] = useState(Date.now()); // For forcing re-render
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogAction, setConfirmDialogAction] = useState<
    "setDefault" | "delete" | null
  >(null);
  const [pendingAddressId, setPendingAddressId] = useState<string | null>(null);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);

  useEffect(() => {
    setNewUsername(user.username);
    // Add timestamp to force cache refresh
    const avatarUrl = user.avatarUrl
      ? `${user.avatarUrl}?t=${Date.now()}`
      : undefined;
    setAvatarPreview(avatarUrl);
    setAvatarKey(Date.now());
  }, [user]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const res = await getAddresses();
      // nếu API return { message, data }
      setAddresses(res.data);
    } catch (error) {
      console.error("Failed to fetch addresses", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: user.email,
    },
  });

  useEffect(() => {
    form.setValue("email", user.email);
  }, [user.email, form]);

  const onEmailSubmit = async (values: EmailFormValues) => {
    if (values.email === user.email) {
      setEditEmail(false);
      return;
    }

    try {
      setLoading(true);
      await updateUserEmail(values.email);
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

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onChangePasswordSubmit = async (values: ChangePasswordFormValues) => {
    try {
      setLoading(true);
      await changeUserPassword(values.currentPassword, values.newPassword);
      await fetchMe();
      setChangePassOpen(false);
      passwordForm.reset();
      toast.success("Password has been changed successfully");
    } catch (error: any) {
      if (error.response && error.response.status === 400) {
        toast.error(error.response.data.message);
      } else if (error.response && error.response.status === 404) {
        toast.error("User not found");
      } else {
         toast.error("Failed to change password");
      }
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

  const handleEditAddress = (address: Address) => {
    setSelectedAddress(address);
    setIsModalOpen(true);
  };

  const handleConfirmDialog = async () => {
    if (confirmDialogAction === "setDefault") {
      if (!pendingAddressId) return;
      try {
        setIsSettingDefault(true);
        await setDefaultAddress(pendingAddressId);
        await fetchAddresses();
        toast.success("Set Default Address Successfully");
        setConfirmDialogOpen(false);
        setPendingAddressId(null);
        setConfirmDialogAction(null);
      } catch (error: any) {
        console.log(error);
        toast.error("Failed to set default address");
      } finally {
        setIsSettingDefault(false);
      }
    } else if (confirmDialogAction === "delete") {
      if (!pendingAddressId) return;
      try {
        setIsDeletingAddress(true);
        await deleteAddress(pendingAddressId);
        await fetchAddresses();
        toast.success("Delete Address Successfully");
        setConfirmDialogOpen(false);
        setPendingAddressId(null);
        setConfirmDialogAction(null);
      } catch (error: any) {
        console.log(error);
        toast.error("Failed to delete address");
      } finally {
        setIsDeletingAddress(false);
      }
    }
  };

  return (
    <div className="w-full">
      {/* Section 1: Avatar & User Info */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Avatar className="w-36 h-36" key={avatarKey}>
                <AvatarImage src={avatarPreview} alt={user.username} />
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
                    className="cursor-pointer bg-[#AAED56] text-[#324E0F] hover:bg-[#8feb1d]"
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
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onEmailSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter new email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 cursor-pointer bg-[#AAED56] text-[#324E0F] hover:bg-[#8feb1d]"
                      >
                        {loading ? "Saving..." : "Save Email"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditEmail(false);
                          form.reset({ email: user.email });
                        }}
                        className="flex-1 cursor-pointer"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
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

                  <Form {...passwordForm}>
                    <form
                      onSubmit={passwordForm.handleSubmit(
                        onChangePasswordSubmit,
                      )}
                      className="space-y-4 py-4"
                    >
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter current password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter new password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Confirm new password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2 justify-end">
                        <AlertDialogCancel
                          className="cursor-pointer"
                          onClick={() => passwordForm.reset()}
                        >
                          Cancel
                        </AlertDialogCancel>
                        <Button
                          type="submit"
                          className="cursor-pointer bg-[#AAED56] text-[#324E0F] hover:bg-[#8feb1d]"
                          disabled={loading}
                        >
                          {loading ? "Saving..." : "Save Password"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        {/* Section 3: User Address */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Address</CardTitle>
                {Array.isArray(addresses) && addresses.length >= 1 && (
                  <Button
                    className="cursor-pointer bg-[#AAED56] text-[#324E0F] hover:bg-[#8feb1d]"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Add Address
                  </Button>
                )}
              </div>
              <CardDescription>
                Your saved addresses will appear here.
              </CardDescription>
            </CardHeader>
            {!loading && addresses.length === 0 && (
              <CardContent className="flex flex-col items-center mt-4 justify-center gap-2">
                <MapIcon className="w-10 h-10 text-muted-foreground" />
                <p className="text-md text-muted-foreground">
                  You have no address yet
                </p>
                <Button
                  className="cursor-pointer bg-[#AAED56] text-[#324E0F] hover:bg-[#8feb1d]"
                  onClick={() => setIsModalOpen(true)}
                >
                  Create Address
                </Button>
              </CardContent>
            )}
            <CardContent className="space-y-4">
              {addresses.map((address) => (
                <AddressItems
                  key={address._id}
                  address={address}
                  onEdit={handleEditAddress}
                  onSetDefault={() => {
                    setPendingAddressId(address._id);
                    setConfirmDialogAction("setDefault");
                    setConfirmDialogOpen(true);
                  }}
                  onDelete={() => {
                    setPendingAddressId(address._id);
                    setConfirmDialogAction("delete");
                    setConfirmDialogOpen(true);
                  }}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      <AddressForm
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAddress(null);
        }}
        initialData={selectedAddress}
        onSubmit={async (payload) => {
          if (selectedAddress) {
            await updateAddress(selectedAddress._id, payload);
          } else {
            await createAddress(payload);
          }
          fetchAddresses();
          setIsModalOpen(false);
        }}
      />
      <ConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={(open) => {
          setConfirmDialogOpen(open);
          if (!open) {
            setConfirmDialogAction(null);
            setPendingAddressId(null);
          }
        }}
        title={
          confirmDialogAction === "setDefault"
            ? "Set Default Address?"
            : "Delete Address?"
        }
        description={
          confirmDialogAction === "setDefault"
            ? "Are you sure you want to set this as your default address?"
            : "Are you sure you want to delete this address?"
        }
        confirmText={
          confirmDialogAction === "setDefault" ? "Set as Default" : "Delete"
        }
        cancelText="Cancel"
        loading={
          confirmDialogAction === "setDefault"
            ? isSettingDefault
            : isDeletingAddress
        }
        isDangerous={confirmDialogAction === "delete"}
        onConfirm={handleConfirmDialog}
      />
    </div>
  );
}
