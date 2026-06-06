import axios from 'axios';
import { API_BASE_URL } from './runtimeConfig.js';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  }

  const auth = localStorage.getItem('verbena_auth');
  if (auth) {
    const { token } = JSON.parse(auth);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const companyApi = {
  register: (data) => api.post('/company/register', data),
  login: (data) => api.post('/company/login', data),
  updateBusiness: (data) => api.post('/company/business-info', data),
  uploadDocument: (formData) => api.post('/company/upload-document', formData),
  getStatus: () => api.get('/company/status'),
  
  // Admin endpoints
  adminListCompanies: () => api.get('/company-admin/companies'),
  adminGetCompany: (id) => api.get(`/company-admin/companies/${id}`),
  adminApprove: (id) => api.post(`/company-admin/approve/${id}`),
  adminReject: (id, reason) => api.post(`/company-admin/reject/${id}`, { reason }),
};
