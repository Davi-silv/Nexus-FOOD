import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { ToastProvider } from '@/contexts/ToastContext.jsx';
import { GuestRoute, ProtectedRoute } from '@/components/routing/ProtectedRoute.jsx';
import { PwaInstallBanner } from '@/components/pwa/PwaInstallBanner.jsx';
import { LoginPage } from '@/pages/auth/LoginPage.jsx';
import { RegisterPage } from '@/pages/auth/RegisterPage.jsx';
import { DashboardPage } from '@/pages/restaurant/DashboardPage.jsx';
import { IngredientsPage } from '@/pages/restaurant/IngredientsPage.jsx';
import { ProductsPage } from '@/pages/restaurant/ProductsPage.jsx';
import { UsersPage } from '@/pages/restaurant/UsersPage.jsx';
import { SettingsPage } from '@/pages/restaurant/SettingsPage.jsx';
import { RecipesPage } from '@/pages/restaurant/RecipesPage.jsx';
import { InventoryPage } from '@/pages/restaurant/InventoryPage.jsx';
import { SuppliersPage } from '@/pages/restaurant/SuppliersPage.jsx';
import { PurchasesPage } from '@/pages/restaurant/PurchasesPage.jsx';
import { WastePage } from '@/pages/restaurant/WastePage.jsx';
import { FinancePage } from '@/pages/restaurant/FinancePage.jsx';
import { ReportsPage } from '@/pages/restaurant/ReportsPage.jsx';
import {
  AdminCompaniesPage,
  AdminDashboardPage,
  AdminPlansPage,
  AdminSubscriptionsPage,
  AdminSupportPage,
  AdminUsersPage,
} from '@/pages/admin/AdminPages.jsx';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <PwaInstallBanner />
          <Routes>
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              }
            />
            <Route
              path="/cadastro"
              element={
                <GuestRoute>
                  <RegisterPage />
                </GuestRoute>
              }
            />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
            </Route>

            <Route element={<ProtectedRoute permission="products" />}>
              <Route path="/produtos" element={<ProductsPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="ingredients" />}>
              <Route path="/ingredientes" element={<IngredientsPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="recipes" />}>
              <Route path="/ficha-tecnica" element={<RecipesPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="inventory" />}>
              <Route path="/estoque" element={<InventoryPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="purchases" />}>
              <Route path="/compras" element={<PurchasesPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="suppliers" />}>
              <Route path="/fornecedores" element={<SuppliersPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="waste" />}>
              <Route path="/desperdicios" element={<WastePage />} />
            </Route>
            <Route element={<ProtectedRoute permission="finance" />}>
              <Route path="/financeiro" element={<FinancePage />} />
            </Route>
            <Route element={<ProtectedRoute permission="reports" />}>
              <Route path="/relatorios" element={<ReportsPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="users" />}>
              <Route path="/usuarios" element={<UsersPage />} />
            </Route>
            <Route element={<ProtectedRoute permission="settings" />}>
              <Route path="/configuracoes" element={<SettingsPage />} />
            </Route>

            <Route element={<ProtectedRoute requirePlatformAdmin />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/empresas" element={<AdminCompaniesPage />} />
              <Route path="/admin/assinaturas" element={<AdminSubscriptionsPage />} />
              <Route path="/admin/usuarios" element={<AdminUsersPage />} />
              <Route path="/admin/planos" element={<AdminPlansPage />} />
              <Route path="/admin/suporte" element={<AdminSupportPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
