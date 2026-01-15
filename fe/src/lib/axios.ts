import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

const API_BASE_URL = (() => {
  const url = "http://localhost:3000";
  if (!url) throw new Error('VITE_API_BASE_URL is not set');
  return url as string;
})();

const defaultConfig: AxiosRequestConfig = {
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
};

const api: AxiosInstance = axios.create(defaultConfig);

const getToken = (): string | null => {
  try {
    return localStorage.getItem('token') ?? localStorage.getItem('auth.token');
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
  (error) => {
    if (error.response) {
      const { status } = error.response;
      if (status === 401) {
        localStorage.removeItem('token');
      }
      // return Promise.reject({
      //   status,
      //   data,
      //   message: data?.message || error.message || 'Request failed',
      // });
    }
    throw error;
  }
);

export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

export default api;
