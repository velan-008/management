import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';
import { LoginPage } from './pages/auth/LoginPage.jsx';
import { RegisterPage } from './pages/auth/RegisterPage.jsx';
import { DashboardPage } from './pages/dashboard/DashboardPage.jsx';
import { InventoryPage } from './pages/inventory/InventoryPage.jsx';
import { POSPage } from './pages/pos/POSPage.jsx';
import { InvoicesPage } from './pages/invoices/InvoicesPage.jsx';
import { CustomersPage } from './pages/customers/CustomersPage.jsx';
import { EmployeesPage } from './pages/employees/EmployeesPage.jsx';
import { ExpensesPage } from './pages/expenses/ExpensesPage.jsx';
import { ReportsPage } from './pages/reports/ReportsPage.jsx';
import { SettingsPage } from './pages/settings/SettingsPage.jsx';
import { PurchasesPage } from './pages/purchases/PurchasesPage.jsx';
import { SuppliersPage } from './pages/suppliers/SuppliersPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Authenticated Dashboard & Business Management Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route
                  path="purchases"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                      <PurchasesPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="pos" element={<POSPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route
                  path="suppliers"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                      <SuppliersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="employees"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                      <EmployeesPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* 404 Catch-All */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
