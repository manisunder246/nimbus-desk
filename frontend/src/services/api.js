// services/api.js — single axios instance for the backend. The request
// interceptor pulls the freshest Cognito ID token from Amplify and stamps
// it as `Authorization: Bearer ...`; the response interceptor signs the
// user out on a 401 so a stale token never silently breaks the UI.
// uploadFileToPresigned() deliberately uses a bare axios — we must NOT
// send the JWT to S3, only the presigned signature in the URL itself.
import axios from 'axios';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({ baseURL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  try {
    const session = await fetchAuthSession();
    const token = session?.tokens?.idToken?.toString();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch { /* unauthenticated request */ }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err?.response?.status === 401) {
      try { await signOut(); } catch { /* ignore */ }
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export const listTickets = (params = {}) => api.get('/tickets', { params }).then((r) => r.data);
export const getTicket = (id) => api.get(`/tickets/${id}`).then((r) => r.data);
export const createTicket = (payload) => api.post('/tickets', payload).then((r) => r.data);
export const updateTicket = (id, patch) => api.patch(`/tickets/${id}`, patch).then((r) => r.data);
export const closeTicket = (id) => api.post(`/tickets/${id}/close`).then((r) => r.data);
export const listUsers = () => api.get('/users').then((r) => r.data);
export const requestPresignedUpload = (body) =>
  api.post('/attachments/presigned-upload', body).then((r) => r.data);
export const attachToTicket = (ticketId, s3Key) =>
  api.patch(`/tickets/${ticketId}/attachment`, { s3Key }).then((r) => r.data);

export async function uploadFileToPresigned(uploadUrl, file) {
  // Note: do NOT use the axios instance here — we don't want JWT on S3 PUT.
  await axios.put(uploadUrl, file, {
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  });
}
