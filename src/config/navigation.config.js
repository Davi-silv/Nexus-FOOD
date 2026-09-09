import {
  LayoutDashboard,
  Package,
  Carrot,
  BookOpen,
  Warehouse,
  ShoppingCart,
  Truck,
  Trash2,
  Wallet,
  BarChart3,
  Users,
  Settings,
  Building2,
  CreditCard,
  LifeBuoy,
  Layers,
} from 'lucide-react';

/** Menu do restaurante (company) */
export const RESTAURANT_NAV = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, permission: 'dashboard' },
  { key: 'products', label: 'Produtos', path: '/produtos', icon: Package, permission: 'products' },
  { key: 'ingredients', label: 'Ingredientes', path: '/ingredientes', icon: Carrot, permission: 'ingredients' },
  { key: 'recipes', label: 'Ficha Técnica', path: '/ficha-tecnica', icon: BookOpen, permission: 'recipes' },
  { key: 'inventory', label: 'Estoque', path: '/estoque', icon: Warehouse, permission: 'inventory' },
  { key: 'purchases', label: 'Compras', path: '/compras', icon: ShoppingCart, permission: 'purchases' },
  { key: 'suppliers', label: 'Fornecedores', path: '/fornecedores', icon: Truck, permission: 'suppliers' },
  { key: 'waste', label: 'Desperdícios', path: '/desperdicios', icon: Trash2, permission: 'waste' },
  { key: 'finance', label: 'Financeiro', path: '/financeiro', icon: Wallet, permission: 'finance' },
  { key: 'reports', label: 'Relatórios', path: '/relatorios', icon: BarChart3, permission: 'reports' },
  { key: 'users', label: 'Usuários', path: '/usuarios', icon: Users, permission: 'users' },
  { key: 'settings', label: 'Configurações', path: '/configuracoes', icon: Settings, permission: 'settings' },
];

/** Menu Super Admin (plataforma Evolutiva Tech) */
export const ADMIN_NAV = [
  { key: 'admin-dashboard', label: 'Dashboard Admin', path: '/admin', icon: LayoutDashboard },
  { key: 'companies', label: 'Empresas', path: '/admin/empresas', icon: Building2 },
  { key: 'subscriptions', label: 'Assinaturas', path: '/admin/assinaturas', icon: CreditCard },
  { key: 'admin-users', label: 'Usuários', path: '/admin/usuarios', icon: Users },
  { key: 'plans', label: 'Planos', path: '/admin/planos', icon: Layers },
  { key: 'support', label: 'Suporte', path: '/admin/suporte', icon: LifeBuoy },
];
