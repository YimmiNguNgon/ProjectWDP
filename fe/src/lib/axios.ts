import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";

const API_BASE_URL = (() => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  return `${url}/api/v1`;
})();

const defaultConfig: AxiosRequestConfig = {
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
};

const api: AxiosInstance = axios.create(defaultConfig);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  isRefreshing = false;
  failedQueue = [];
};

const getToken = (): string | null => {
  try {
    return localStorage.getItem("token") ?? localStorage.getItem("auth.token");
  } catch {
    return null;
  }
};

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        console.log("Refresh successful", response.data);
        const { accessToken } = response.data;
        setAuthToken(accessToken);

        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (err) {
        console.error("Interceptor refresh failed:", err);
        processQueue(err, null);
        localStorage.removeItem("token");
        window.location.href = "/auth/sign-in";
        return Promise.reject(err);
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
    }

    throw error;
  }
);

export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export default api;
