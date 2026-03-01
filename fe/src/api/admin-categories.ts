import api from '../lib/axios';

export interface AdminCategory {
  _id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetAdminCategoriesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface GetAdminCategoriesResponse {
  success: boolean;
  data: AdminCategory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminCategoryPayload {
  name: string;
  slug?: string;
  imageUrl?: string;
}

export const getAllAdminCategories = async (
  params: GetAdminCategoriesParams = {},
): Promise<GetAdminCategoriesResponse> => {
  const response = await api.get('/api/admin/categories', { params });
  return response.data;
};

export const getAdminCategoryDetail = async (categoryId: string) => {
  const response = await api.get(`/api/admin/categories/${categoryId}`);
  return response.data;
};

export const createAdminCategory = async (payload: AdminCategoryPayload) => {
  const response = await api.post('/api/admin/categories', payload);
  return response.data;
};

export const updateAdminCategory = async (
  categoryId: string,
  payload: Partial<AdminCategoryPayload>,
) => {
  const response = await api.put(`/api/admin/categories/${categoryId}`, payload);
  return response.data;
};

export const deleteAdminCategory = async (categoryId: string) => {
  const response = await api.delete(`/api/admin/categories/${categoryId}`);
  return response.data;
};
