import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'https://crm-backend-n1.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }, 
});

const API = {
  // Auth
  async login(email, password) {
    const res = await api.post('/api/auth/login', { email, password });
    return res.data;
  }, 
  async register(data) {
    const res = await api.post('/api/auth/register', data);
    return res.data;
  },

  // Generic CRUD
  async getAll(table, params = {}) {
    const res = await api.get(`/api/tables/${table}`, { params: { limit: 200, ...params } });
    return res.data;
  },
  async getOne(table, id) {
    const res = await api.get(`/api/tables/${table}/${id}`);
    return res.data;
  },
  async create(table, data) {
    const res = await api.post(`/api/tables/${table}`, data);
    return res.data;
  },
  async update(table, id, data) {
    const res = await api.put(`/api/tables/${table}/${id}`, data);
    return res.data;
  },
  async patch(table, id, data) {
    const res = await api.patch(`/api/tables/${table}/${id}`, data);
    return res.data;
  },
  async delete(table, id) {
    const res = await api.delete(`/api/tables/${table}/${id}`);
    return res.data;
  },
};

export default API;
