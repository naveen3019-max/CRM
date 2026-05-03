import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
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
  uploadDocument: (formData) => api.post('/company/upload-document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getStatus: () => api.get('/company/status'),
  
  // Admin endpoints
  adminListCompanies: () => api.get('/company-admin/companies'),
  adminGetCompany: (id) => api.get(`/company-admin/companies/${id}`),
  adminApprove: (id) => api.post(`/company-admin/approve/${id}`),
  adminReject: (id, reason) => api.post(`/company-admin/reject/${id}`, { reason }),
};
