import api from "@/lib/axios";

export type WatchlistItem = {
  _id: string;
  user: string;
  product: {
    _id: string;
    title: string;
    price: number;
    image?: string;
    images?: string[];
    condition?: string;
    listingStatus: string;
    sellerId: {
      _id: string;
      username: string;
    };
    watchCount: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const toggleWatchlist = async (productId: string) => {
  return await api.post(`/api/watchlist/toggle-watchlist/${productId}`);
};

export const getUserWatchlist = async () => {
  return await api.get<{ message: string; data: WatchlistItem[] }>(
    "/api/watchlist/get-user-watchlist"
  );
};

export const getWatchCount = async (productId: string) => {
  return await api.get<number>(`/api/watchlist/get-watch-count/${productId}`);
};
