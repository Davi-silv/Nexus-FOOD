import { ROLES, DEFAULT_EMPLOYEE_PERMISSIONS } from '@/config/roles.config.js';

/**
 * Dados de demonstração — Hamburgueria Nexus.
 * Usados quando Supabase não está configurado.
 */
export const DEMO_COMPANY = {
  id: 'company_demo_nexus',
  name: 'Hamburgueria Nexus Ltda',
  tradeName: 'Hamburgueria Nexus',
  document: '12.345.678/0001-90',
  segment: 'hamburgueria',
  planSlug: 'pro',
  status: 'active',
  idealCmv: 32,
};

/** Seed de catálogo/financeiro só para a empresa de demonstração. */
export function isDemoCompany(companyId) {
  return companyId === DEMO_COMPANY.id;
}

export const DEMO_USERS = {
  admin: {
    id: 'user_demo_admin',
    email: 'admin@nexusfood.local',
    password: 'admin',
    name: 'Ana Gestora',
    role: ROLES.COMPANY_ADMIN,
    companyId: DEMO_COMPANY.id,
  },
  employee: {
    id: 'user_demo_staff',
    email: 'estoque@nexusfood.local',
    password: 'estoque',
    name: 'Carlos Estoque',
    role: ROLES.EMPLOYEE,
    companyId: DEMO_COMPANY.id,
    permissions: {
      ...DEFAULT_EMPLOYEE_PERMISSIONS,
      inventory: true,
      waste: true,
      purchases: true,
      finance: false,
    },
  },
  superAdmin: {
    id: 'user_demo_super',
    email: 'super@evolutivatech.com.br',
    password: 'super',
    name: 'Suporte Evolutiva',
    role: ROLES.PLATFORM_SUPER_ADMIN,
    companyId: null,
  },
};

export const DEMO_INGREDIENTS = [
  { id: 'ing_pao', name: 'Pão brioche', category: 'Pães', unit: 'un', quantity: 48, minStock: 30, currentCost: 1.2 },
  { id: 'ing_carne', name: 'Carne', category: 'Proteínas', unit: 'kg', quantity: 8.5, minStock: 5, currentCost: 42.9 },
  { id: 'ing_bacon', name: 'Bacon', category: 'Proteínas', unit: 'kg', quantity: 1.2, minStock: 2, currentCost: 38.5 },
  { id: 'ing_queijo', name: 'Queijo', category: 'Laticínios', unit: 'kg', quantity: 3.4, minStock: 2, currentCost: 32 },
  { id: 'ing_alface', name: 'Alface', category: 'Hortifruti', unit: 'un', quantity: 12, minStock: 8, currentCost: 3.5 },
  { id: 'ing_tomate', name: 'Tomate', category: 'Hortifruti', unit: 'kg', quantity: 4.1, minStock: 3, currentCost: 7.9 },
  { id: 'ing_molho', name: 'Molho', category: 'Molhos', unit: 'L', quantity: 2.5, minStock: 1.5, currentCost: 18 },
  { id: 'ing_batata', name: 'Batata', category: 'Hortifruti', unit: 'kg', quantity: 18, minStock: 10, currentCost: 6.5 },
  { id: 'ing_oleo', name: 'Óleo', category: 'Óleos', unit: 'L', quantity: 6, minStock: 3, currentCost: 9.9 },
  { id: 'ing_embalagem', name: 'Embalagem', category: 'Descartáveis', unit: 'un', quantity: 120, minStock: 50, currentCost: 0.45 },
];

export const DEMO_PRODUCTS = [
  { id: 'prd_xbacon', name: 'X-Bacon', category: 'Hambúrguer', salePrice: 31.9, available: true },
  { id: 'prd_xtudo', name: 'X-Tudo', category: 'Hambúrguer', salePrice: 36.9, available: true },
  { id: 'prd_xsalada', name: 'X-Salada', category: 'Hambúrguer', salePrice: 28.9, available: true },
  { id: 'prd_batata_p', name: 'Batata P', category: 'Porção', salePrice: 14.9, available: true },
  { id: 'prd_batata_g', name: 'Batata G', category: 'Porção', salePrice: 22.9, available: true },
  { id: 'prd_coca', name: 'Coca-Cola', category: 'Bebida', salePrice: 8.9, available: true },
  { id: 'prd_combo', name: 'Combo Nexus', category: 'Combo', salePrice: 49.9, available: true },
];

/** Fichas técnicas demo (itens referenciam DEMO_INGREDIENTS) */
export const DEMO_RECIPES = [
  {
    id: 'rcp_xbacon',
    productId: 'prd_xbacon',
    items: [
      { ingredientId: 'ing_pao', quantity: 1, unit: 'un' },
      { ingredientId: 'ing_carne', quantity: 150, unit: 'g' },
      { ingredientId: 'ing_bacon', quantity: 50, unit: 'g' },
      { ingredientId: 'ing_queijo', quantity: 40, unit: 'g' },
      { ingredientId: 'ing_molho', quantity: 30, unit: 'ml' },
      { ingredientId: 'ing_embalagem', quantity: 1, unit: 'un' },
    ],
  },
  {
    id: 'rcp_xtudo',
    productId: 'prd_xtudo',
    items: [
      { ingredientId: 'ing_pao', quantity: 1, unit: 'un' },
      { ingredientId: 'ing_carne', quantity: 180, unit: 'g' },
      { ingredientId: 'ing_bacon', quantity: 40, unit: 'g' },
      { ingredientId: 'ing_queijo', quantity: 50, unit: 'g' },
      { ingredientId: 'ing_alface', quantity: 1, unit: 'un' },
      { ingredientId: 'ing_tomate', quantity: 40, unit: 'g' },
      { ingredientId: 'ing_molho', quantity: 40, unit: 'ml' },
      { ingredientId: 'ing_embalagem', quantity: 1, unit: 'un' },
    ],
  },
  {
    id: 'rcp_xsalada',
    productId: 'prd_xsalada',
    items: [
      { ingredientId: 'ing_pao', quantity: 1, unit: 'un' },
      { ingredientId: 'ing_carne', quantity: 120, unit: 'g' },
      { ingredientId: 'ing_queijo', quantity: 30, unit: 'g' },
      { ingredientId: 'ing_alface', quantity: 1, unit: 'un' },
      { ingredientId: 'ing_tomate', quantity: 50, unit: 'g' },
      { ingredientId: 'ing_molho', quantity: 25, unit: 'ml' },
      { ingredientId: 'ing_embalagem', quantity: 1, unit: 'un' },
    ],
  },
  {
    id: 'rcp_batata_p',
    productId: 'prd_batata_p',
    items: [
      { ingredientId: 'ing_batata', quantity: 0.2, unit: 'kg' },
      { ingredientId: 'ing_oleo', quantity: 0.05, unit: 'L' },
      { ingredientId: 'ing_embalagem', quantity: 1, unit: 'un' },
    ],
  },
  {
    id: 'rcp_batata_g',
    productId: 'prd_batata_g',
    items: [
      { ingredientId: 'ing_batata', quantity: 0.35, unit: 'kg' },
      { ingredientId: 'ing_oleo', quantity: 0.08, unit: 'L' },
      { ingredientId: 'ing_embalagem', quantity: 1, unit: 'un' },
    ],
  },
  {
    id: 'rcp_combo',
    productId: 'prd_combo',
    items: [
      { ingredientId: 'ing_pao', quantity: 1, unit: 'un' },
      { ingredientId: 'ing_carne', quantity: 150, unit: 'g' },
      { ingredientId: 'ing_bacon', quantity: 50, unit: 'g' },
      { ingredientId: 'ing_queijo', quantity: 40, unit: 'g' },
      { ingredientId: 'ing_molho', quantity: 30, unit: 'ml' },
      { ingredientId: 'ing_batata', quantity: 0.2, unit: 'kg' },
      { ingredientId: 'ing_oleo', quantity: 0.05, unit: 'L' },
      { ingredientId: 'ing_embalagem', quantity: 2, unit: 'un' },
    ],
  },
];

export const DEMO_DASHBOARD = {
  revenueToday: 1847.5,
  revenueMonth: 42890.2,
  ordersToday: 62,
  avgTicket: 29.8,
  costsMonth: 14210.4,
  grossProfitMonth: 28679.8,
  cmvPercent: 33.1,
  wasteMonth: 879.4,
  stockValue: 4120.75,
  payablesPending: 5340,
  revenueSeries: [
    { label: 'Seg', value: 4200 },
    { label: 'Ter', value: 5100 },
    { label: 'Qua', value: 4800 },
    { label: 'Qui', value: 6200 },
    { label: 'Sex', value: 8900 },
    { label: 'Sáb', value: 9800 },
    { label: 'Dom', value: 3890 },
  ],
  topSold: [
    { name: 'X-Bacon', qty: 312, revenue: 9952.8 },
    { name: 'Combo Nexus', qty: 148, revenue: 7385.2 },
    { name: 'X-Tudo', qty: 190, revenue: 7011 },
    { name: 'Batata G', qty: 210, revenue: 4809 },
  ],
  topMargin: [
    { name: 'X-Bacon', price: 31.9, cost: 10.38, margin: 67.46 },
    { name: 'X-Salada', price: 28.9, cost: 8.9, margin: 69.2 },
    { name: 'Combo Nexus', price: 49.9, cost: 18.4, margin: 63.1 },
  ],
  criticalStock: [
    { name: 'Bacon', quantity: 1.2, unit: 'kg', level: 'critical' },
    { name: 'Pão brioche', quantity: 18, unit: 'un', level: 'low' },
  ],
  alerts: [
    { id: 1, tone: 'danger', message: 'Seu estoque de bacon está abaixo do mínimo.' },
    { id: 2, tone: 'warning', message: 'O custo da carne aumentou 12%.' },
    { id: 3, tone: 'warning', message: 'O desperdício deste mês aumentou 18%.' },
    { id: 4, tone: 'info', message: 'O custo do X-Bacon aumentou R$ 1,32.' },
  ],
};

export const DEMO_PLATFORM_STATS = {
  activeClients: 48,
  trials: 11,
  pastDue: 3,
  mrr: 6240.5,
  totalUsers: 186,
};
