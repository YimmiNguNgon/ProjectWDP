import api from "@/lib/axios";

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
