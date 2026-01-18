import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    getUserProfile,
    updateUserProfile,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    upgradeToPremium,
    type UserProfile,
    type Address,
} from "@/api/user";
import { toast } from "sonner";
import {
    User,
    Mail,
    Phone,
    MapPin,
    Crown,
    Plus,
    Edit,
    Trash2,
    Star,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    fetchProvinces,
    fetchDistrictsByProvince,
    fetchWardsByDistrict,
    findProvinceCodeByName,
    findDistrictCodeByName,
    type Province,
    type District as DistrictType,
    type Ward,
} from "@/data/provinces";

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [addressDialogOpen, setAddressDialogOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);

    // Location states
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [districts, setDistricts] = useState<DistrictType[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);

    const [profileForm, setProfileForm] = useState({
        username: "",
        phone: "",
        bio: "",
    });

    const [addressForm, setAddressForm] = useState({
        fullName: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        district: "",
        ward: "",
        state: "",
        country: "Vietnam",
        isDefault: false,
    });

    useEffect(() => {
        loadProfile();
        loadProvinces();
    }, []);

    const loadProvinces = async () => {
        const data = await fetchProvinces();
        setProvinces(data);
    };

    const handleProvinceChange = async (value: string) => {
        setAddressForm(prev => ({ ...prev, state: value, district: "", ward: "", city: value }));
        setDistricts([]);
        setWards([]);

        const provinceCode = findProvinceCodeByName(provinces, value);
        if (provinceCode) {
            const districtList = await fetchDistrictsByProvince(provinceCode);
            setDistricts(districtList);
        }
    };

    const handleDistrictChange = async (value: string) => {
        setAddressForm(prev => ({ ...prev, district: value, ward: "" }));
        setWards([]);

        const districtCode = findDistrictCodeByName(districts, value);
        if (districtCode) {
            const wardList = await fetchWardsByDistrict(districtCode);
            setWards(wardList);
        }
    };

    const loadProfile = async () => {
        try {
            setLoading(true);
            const res = await getUserProfile();
            setProfile(res.data);
            setProfileForm({
                username: res.data.username || "",
                phone: res.data.phone || "",
                bio: res.data.bio || "",
            });
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to load profile");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        try {
            const res = await updateUserProfile(profileForm);
            setProfile(res.data);
            setEditMode(false);
            toast.success("Profile updated successfully!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update profile");
        }
    };

    const handleAddAddress = async () => {
        try {
            await addAddress(addressForm);
            await loadProfile();
            setAddressDialogOpen(false);
            resetAddressForm();
            toast.success("Address added successfully!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to add address");
        }
    };

    const handleUpdateAddress = async () => {
        if (!editingAddress) return;
        try {
            await updateAddress(editingAddress._id, addressForm);
            await loadProfile();
            setAddressDialogOpen(false);
            setEditingAddress(null);
            resetAddressForm();
            toast.success("Address updated successfully!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update address");
        }
    };

    const handleDeleteAddress = async (addressId: string) => {
        if (!confirm("Are you sure you want to delete this address?")) return;
        try {
            await deleteAddress(addressId);
            await loadProfile();
            toast.success("Address deleted successfully!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete address");
        }
    };

    const handleSetDefaultAddress = async (addressId: string) => {
        try {
            await setDefaultAddress(addressId);
            await loadProfile();
            toast.success("Default address set successfully!");
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || "Failed to set default address"
            );
        }
    };

    const handleUpgradePremium = async () => {
        if (!confirm("Upgrade to Premium for $99/year?")) return;
        try {
            const res = await upgradeToPremium();
            setProfile(res.data);
            toast.success("Successfully upgraded to Premium!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to upgrade");
        }
    };

    const resetAddressForm = () => {
        setAddressForm({
            fullName: "",
            phone: "",
            addressLine1: "",
            addressLine2: "",
            city: "",
            district: "",
            ward: "",
            state: "",
            country: "Vietnam",
            isDefault: false,
        });
        setDistricts([]);
        setWards([]);
    };

    const openAddressDialog = async (address?: Address) => {
        if (address) {
            setEditingAddress(address);
            setAddressForm({
                fullName: address.fullName,
                phone: address.phone,
                addressLine1: address.addressLine1,
                addressLine2: address.addressLine2 || "",
                city: address.city,
                district: address.district || "",
                ward: address.ward || "",
                state: address.state,
                country: address.country,
                isDefault: address.isDefault,
            });

            // Load districts recursively
            if (address.state) {
                const provinceCode = findProvinceCodeByName(provinces, address.state);
                if (provinceCode) {
                    const districtList = await fetchDistrictsByProvince(provinceCode);
                    setDistricts(districtList);

                    // Load wards if district exists
                    if (address.district) {
                        const districtCode = findDistrictCodeByName(districtList, address.district);
                        if (districtCode) {
                            const wardList = await fetchWardsByDistrict(districtCode);
                            setWards(wardList);
                        }
                    }
                }
            }
        } else {
            setEditingAddress(null);
            resetAddressForm();
        }
        setAddressDialogOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-muted-foreground">Failed to load profile</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">My Profile</h1>
                {profile.accountType === "basic" && (
                    <Button onClick={handleUpgradePremium} className="gap-2">
                        <Crown className="h-4 w-4" />
                        Upgrade to Premium
                    </Button>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Profile Information</CardTitle>
                                <CardDescription>
                                    Manage your account details
                                </CardDescription>
                            </div>
                            {profile.accountType === "premium" && (
                                <Badge variant="default" className="gap-1">
                                    <Crown className="h-3 w-3" />
                                    Premium
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            {editMode ? (
                                <Input
                                    id="username"
                                    value={profileForm.username}
                                    onChange={(e) =>
                                        setProfileForm({ ...profileForm, username: e.target.value })
                                    }
                                />
                            ) : (
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    {profile.username}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Email</Label>
                            <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                {profile.email}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            {editMode ? (
                                <Input
                                    id="phone"
                                    value={profileForm.phone}
                                    onChange={(e) =>
                                        setProfileForm({ ...profileForm, phone: e.target.value })
                                    }
                                    placeholder="Enter phone number"
                                />
                            ) : (
                                <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    {profile.phone || "Not set"}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio">Bio</Label>
                            {editMode ? (
                                <Textarea
                                    id="bio"
                                    value={profileForm.bio}
                                    onChange={(e) =>
                                        setProfileForm({ ...profileForm, bio: e.target.value })
                                    }
                                    placeholder="Tell us about yourself"
                                    rows={3}
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {profile.bio || "No bio yet"}
                                </p>
                            )}
                        </div>

                        <Separator />

                        <div className="flex gap-2">
                            {editMode ? (
                                <>
                                    <Button onClick={handleUpdateProfile}>Save Changes</Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setEditMode(false);
                                            setProfileForm({
                                                username: profile.username || "",
                                                phone: profile.phone || "",
                                                bio: profile.bio || "",
                                            });
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <Button onClick={() => setEditMode(true)} variant="outline">
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Profile
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Account Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Role</span>
                            <Badge variant="secondary">{profile.role}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Reputation</span>
                            <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-medium">{profile.reputationScore}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Member Since</span>
                            <span className="text-sm font-medium">
                                {new Date(profile.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        {profile.accountType === "premium" && profile.premiumExpiresAt && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    Premium Expires
                                </span>
                                <span className="text-sm font-medium">
                                    {new Date(profile.premiumExpiresAt).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="md:col-span-3">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Shipping Addresses</CardTitle>
                                <CardDescription>
                                    Manage your delivery addresses
                                </CardDescription>
                            </div>
                            <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button onClick={() => openAddressDialog()}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Address
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>
                                            {editingAddress ? "Edit Address" : "Add New Address"}
                                        </DialogTitle>
                                        <DialogDescription>
                                            {editingAddress
                                                ? "Update your shipping address"
                                                : "Add a new shipping address"}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="fullName">Full Name *</Label>
                                                <Input
                                                    id="fullName"
                                                    value={addressForm.fullName}
                                                    onChange={(e) =>
                                                        setAddressForm({
                                                            ...addressForm,
                                                            fullName: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="addressPhone">Phone *</Label>
                                                <Input
                                                    id="addressPhone"
                                                    value={addressForm.phone}
                                                    onChange={(e) =>
                                                        setAddressForm({
                                                            ...addressForm,
                                                            phone: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="addressLine1">Address Line 1 *</Label>
                                            <Input
                                                id="addressLine1"
                                                value={addressForm.addressLine1}
                                                onChange={(e) =>
                                                    setAddressForm({
                                                        ...addressForm,
                                                        addressLine1: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="addressLine2">Address Line 2</Label>
                                            <Input
                                                id="addressLine2"
                                                value={addressForm.addressLine2}
                                                onChange={(e) =>
                                                    setAddressForm({
                                                        ...addressForm,
                                                        addressLine2: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="state">Tỉnh/Thành phố *</Label>
                                                <Select
                                                    value={addressForm.state}
                                                    onValueChange={handleProvinceChange}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Chọn Tỉnh/Thành" />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-[300px]">
                                                        {provinces.map((province) => (
                                                            <SelectItem key={province.code} value={province.name}>
                                                                {province.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="district">Quận/Huyện</Label>
                                                <Select
                                                    value={addressForm.district}
                                                    onValueChange={handleDistrictChange}
                                                    disabled={!addressForm.state}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Chọn Quận/Huyện" />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-[300px]">
                                                        {districts.map((district) => (
                                                            <SelectItem key={district.code} value={district.name}>
                                                                {district.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="ward">Phường/Xã</Label>
                                            <Select
                                                value={addressForm.ward}
                                                onValueChange={(value) => setAddressForm(prev => ({ ...prev, ward: value }))}
                                                disabled={!addressForm.district}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Chọn Phường/Xã" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[300px]">
                                                    {wards.map((ward) => (
                                                        <SelectItem key={ward.code} value={ward.name}>
                                                            {ward.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="country">Country *</Label>
                                            <Input
                                                id="country"
                                                value={addressForm.country}
                                                onChange={(e) =>
                                                    setAddressForm({
                                                        ...addressForm,
                                                        country: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setAddressDialogOpen(false);
                                                setEditingAddress(null);
                                                resetAddressForm();
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={
                                                editingAddress ? handleUpdateAddress : handleAddAddress
                                            }
                                        >
                                            {editingAddress ? "Update" : "Add"} Address
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {profile.addresses.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No addresses saved yet</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {profile.addresses.map((address) => (
                                    <Card
                                        key={address._id}
                                        className={
                                            address.isDefault ? "border-primary border-2" : ""
                                        }
                                    >
                                        <CardContent className="pt-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex-1">
                                                    <p className="font-medium">{address.fullName}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {address.phone}
                                                    </p>
                                                </div>
                                                {address.isDefault && (
                                                    <Badge variant="default">Default</Badge>
                                                )}
                                            </div>
                                            <div className="text-sm text-muted-foreground space-y-1">
                                                <p>{address.addressLine1}</p>
                                                {address.addressLine2 && <p>{address.addressLine2}</p>}
                                                <p>
                                                    {address.ward ? `${address.ward}, ` : ""}
                                                    {address.district ? `${address.district}, ` : ""}
                                                    {address.state}
                                                </p>
                                                <p>{address.country}</p>
                                            </div>
                                            <div className="flex gap-2 mt-4">
                                                {!address.isDefault && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleSetDefaultAddress(address._id)}
                                                    >
                                                        Set Default
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openAddressDialog(address)}
                                                >
                                                    <Edit className="h-3 w-3 mr-1" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDeleteAddress(address._id)}
                                                >
                                                    <Trash2 className="h-3 w-3 mr-1" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
