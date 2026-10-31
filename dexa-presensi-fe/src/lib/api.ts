import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
});
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('dexa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = sessionStorage.getItem('dexa_token');
    if (
      error.response?.status === 401 &&
      token &&
      error.config?.headers?.Authorization === `Bearer ${token}` &&
      !error.config?.url?.endsWith('/auth/login')
    ) {
      window.dispatchEvent(new Event('dexa:session-expired'));
    }
    return Promise.reject(error);
  },
);
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
    if (!error.response)
      return 'Unable to connect to the server. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}
