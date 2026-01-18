import api from "@/lib/axios";

export interface UserProfile {
    _id: string;
    username: string;
    email: string;
    role: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    accountType: "basic" | "premium";
    premiumExpiresAt?: Date;
    premiumActivatedAt?: Date;
    addresses: Address[];
    reputationScore: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Address {
    _id: string;
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    district?: string;
    ward?: string;
    state: string;
    country: string;
    isDefault: boolean;
}

export interface UpdateProfileData {
    username?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
}

export interface AddAddressData {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    district?: string;
    ward?: string;
    state: string;
    country?: string;
    isDefault?: boolean;
}

// Get user profile
export const getUserProfile = async () => {
    const res = await api.get("/api/v1/users/profile");
    return res.data;
};

// Update user profile
export const updateUserProfile = async (data: UpdateProfileData) => {
    const res = await api.put("/api/v1/users/profile", data);
    return res.data;
};

// Add address
export const addAddress = async (data: AddAddressData) => {
    const res = await api.post("/api/v1/users/addresses", data);
    return res.data;
};

// Update address
export const updateAddress = async (addressId: string, data: Partial<AddAddressData>) => {
    const res = await api.put(`/api/v1/users/addresses/${addressId}`, data);
    return res.data;
};

// Delete address
export const deleteAddress = async (addressId: string) => {
    const res = await api.delete(`/api/v1/users/addresses/${addressId}`);
    return res.data;
};

// Set default address
export const setDefaultAddress = async (addressId: string) => {
    const res = await api.post(`/api/v1/users/addresses/${addressId}/set-default`);
    return res.data;
};

// Upgrade to premium
export const upgradeToPremium = async () => {
    const res = await api.post("/api/v1/users/upgrade-premium");
    return res.data;
};
