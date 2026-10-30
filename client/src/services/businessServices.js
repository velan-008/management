import api from './api.js';

export const productService = {
  list: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  adjustStock: (id, data) => api.post(`/products/${id}/adjust-stock`, data),
  stockMovements: (id, params) => api.get(`/products/${id}/movements`, { params }),
  allMovements: (params) => api.get('/products/movements', { params }),
  // Categories (compatible with /products/categories and /categories)
  listCategories: () => api.get('/categories'),
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`)
};

export const categoryService = {
  list: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`)
};

export const customerService = {
  list: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  salesHistory: (id) => api.get(`/customers/${id}/sales`)
};

export const saleService = {
  list: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post('/sales', data),
  addPayment: (id, data) => api.post(`/sales/${id}/payments`, data),
  refund: (id, data) => api.post(`/sales/${id}/refund`, data)
};

export const expenseService = {
  list: (params) => api.get('/expenses', { params }),
  getById: (id) => api.get(`/expenses/${id}`),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
  approve: (id) => api.patch(`/expenses/${id}/approve`),
  reject: (id) => api.patch(`/expenses/${id}/reject`)
};

export const supplierService = {
  list: (params) => api.get('/suppliers', { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
  recordPayment: (id, data) => api.post(`/suppliers/${id}/payments`, data)
};

export const purchaseService = {
  list: (params) => api.get('/purchases', { params }),
  getById: (id) => api.get(`/purchases/${id}`),
  create: (data) => api.post('/purchases', data),
  receiveGoods: (id, data) => api.post(`/purchases/${id}/receive`, data),
  recordPayment: (id, data) => api.post(`/purchases/${id}/payments`, data),
  cancel: (id) => api.post(`/purchases/${id}/cancel`)
};

export const employeeService = {
  list: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  deactivate: (id) => api.patch(`/employees/${id}/deactivate`),
  recordAttendance: (id, data) => api.post(`/employees/${id}/attendance`, data),
  getAttendance: (id, params) => api.get(`/employees/${id}/attendance`, { params }),
  recordSalary: (id, data) => api.post(`/employees/${id}/salary`, data),
  getSalaries: (id) => api.get(`/employees/${id}/salaries`)
};

export const reportService = {
  getDashboard: (params) => api.get('/reports/dashboard', { params }),
  getProfitLoss: (params) => api.get('/reports/profit-loss', { params }),
  getSalesSummary: (params) => api.get('/reports/sales-summary', { params }),
  getInventory: () => api.get('/reports/inventory'),
  exportCsvUrl: (type) => `/api/reports/export/${type}`
};
