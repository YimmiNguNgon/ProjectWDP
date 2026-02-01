import api from "@/lib/axios";

// Address types
export interface Address {
  _id: string;
  user: string;
  fullName: string;
  phone: string;
  country?: string;
  city?: string;
  district?: string;
  ward?: string;
  street?: string;
  detail?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressPayload {
  fullName: string;
  phone: string;
  country?: string;
  city?: string;
  district?: string;
  ward?: string;
  street?: string;
  detail?: string;
  isDefault?: boolean;
}

export interface CreateAddressResponse {
  message: string;
  data: Address;
}

export interface GetAddressesResponse {
  message: string;
  data: Address[];
}

export interface GetAddressResponse {
  message: string;
  data: Address;
}

export interface UpdateProfilePayload {
  username: string;
  avatarUrl?: string;
}

export interface UpdateProfileResponse {
  message: string;
  user: {
    _id: string;
    username: string;
    email: string;
    avatarUrl?: string;
  };
}

/**
 * Upload ảnh lên Cloudinary
 */
export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "upload_preset",
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  );
  formData.append("cloud_name", import.meta.env.VITE_CLOUDINARY_CLOUD_NAME);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error("Failed to upload image to Cloudinary");
  }

  const data = await response.json();
  return data.secure_url;
};

/**
 * Update user profile với username và avatar
 */
export const updateUserProfile = async (
  payload: UpdateProfilePayload,
): Promise<UpdateProfileResponse> => {
  try {
    const response = await api.put<UpdateProfileResponse>(
      "/api/users/update-user-profile",
      payload,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user email
 */
export const updateUserEmail = async (email: string): Promise<any> => {
  try {
    const response = await api.put("/api/users/update-user-email", { email });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Change user password
 */
export const changeUserPassword = async (
  currentPassword: string,
  newPassword: string,
): Promise<any> => {
  try {
    const response = await api.put("/api/users/change-password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
/**
 * Create a new address
 */
export const createAddress = async (
  payload: CreateAddressPayload,
): Promise<CreateAddressResponse> => {
  try {
    const response = await api.post<CreateAddressResponse>(
      "/api/addresses",
      payload,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all addresses for current user
 */
export const getAddresses = async (): Promise<GetAddressesResponse> => {
  try {
    const response = await api.get<GetAddressesResponse>("/api/addresses");
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Update Address
 */
export const updateAddress = async (
  id: string,
  payload: CreateAddressPayload,
): Promise<CreateAddressResponse> => {
  try {
    const response = await api.put<CreateAddressResponse>(
      `/api/addresses/update-address/${id}`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Set Default Address
 */
export const setDefaultAddress = async (id: string) => {
  try {
    const response = await api.put(`/api/addresses/set-default-address/${id}`);

    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete Address
 */
export const deleteAddress = async (id: string) => {
  try {
    const response = await api.post(`/api/addresses/delete-address/${id}`);

    return response.data;
  } catch (error) {
    throw error;
  }
};
