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
  const response = await api.put<UpdateProfileResponse>(
    "/users/update-user-profile",
    payload,
  );
  return response.data;
};

/**
 * Update user email
 */
export const updateUserEmail = async (email: string): Promise<any> => {
  const response = await api.put("/users/update-user-email", { email });
  return response.data;
};

/**
 * Change user password
 */
export const changeUserPassword = async (
  oldPassword: string,
  newPassword: string,
): Promise<any> => {
  const response = await api.put("/users/change-password", {
    oldPassword,
    newPassword,
  });
  return response.data;
};
