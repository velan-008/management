import api from './api.js';

export const productService = {
  list: (params) => api.get('/products', { params }),
  search: (q, params) => api.get('/products/search', { params: { q, ...params } }),
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
  list: (params) => api.get('/categories', { params }),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`)
};

export const subCategoryService = {
  list: (params) => api.get('/sub-categories', { params }),
  getById: (id) => api.get(`/sub-categories/${id}`),
  create: (data) => api.post('/sub-categories', data),
  update: (id, data) => api.put(`/sub-categories/${id}`, data),
  delete: (id) => api.delete(`/sub-categories/${id}`)
};

export const brandService = {
  list: (params) => api.get('/brands', { params }),
  getById: (id) => api.get(`/brands/${id}`),
  create: (data) => api.post('/brands', data),
  update: (id, data) => api.put(`/brands/${id}`, data),
  delete: (id) => api.delete(`/brands/${id}`)
};

export const unitService = {
  list: (params) => api.get('/units', { params }),
  getById: (id) => api.get(`/units/${id}`),
  create: (data) => api.post('/units', data),
  update: (id, data) => api.put(`/units/${id}`, data),
  delete: (id) => api.delete(`/units/${id}`)
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

export const invoiceService = {
  list: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  syncBatch: (data) => api.post('/invoices/sync-batch', data)
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
  getPayments: (params) => api.get('/reports/payments', { params }),
  getExpenses: (params) => api.get('/reports/expenses', { params }),
  getGstReport: (params) => api.get('/reports/gst', { params }),
  getCustomersReport: (params) => api.get('/reports/customers', { params }),
  getSuppliersReport: (params) => api.get('/reports/suppliers', { params }),
  exportCsvUrl: (type) => `/api/reports/export/${type}`,
  exportCsv: async (type) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token required. Please log in again.');
    }
    return api.get(`/reports/export/${type}`, {
      responseType: 'blob'
    });
  },
  downloadCsv: async (type, filename) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token required. Please log in again.');
    }
    const data = await api.get(`/reports/export/${type}`, {
      responseType: 'blob'
    });
    const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || `export-${type}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return true;
  }
};
