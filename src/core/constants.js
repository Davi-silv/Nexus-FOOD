export const UNITS = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'L', label: 'L' },
  { value: 'ml', label: 'ml' },
  { value: 'un', label: 'unidade' },
  { value: 'cx', label: 'caixa' },
  { value: 'pct', label: 'pacote' },
];

export const PRODUCT_CATEGORIES = [
  'Hambúrguer',
  'Pizza',
  'Porção',
  'Bebida',
  'Sobremesa',
  'Combo',
];

export const INGREDIENT_CATEGORIES = [
  'Pães',
  'Proteínas',
  'Laticínios',
  'Hortifruti',
  'Molhos',
  'Óleos',
  'Descartáveis',
  'Bebidas',
  'Outros',
];

export const WASTE_REASONS = [
  { value: 'expiration', label: 'Vencimento' },
  { value: 'production_error', label: 'Erro de produção' },
  { value: 'damaged', label: 'Produto danificado' },
  { value: 'leftover', label: 'Sobra' },
  { value: 'operational', label: 'Erro operacional' },
  { value: 'other', label: 'Outro' },
];

export const INVENTORY_MOVEMENT_TYPES = [
  { value: 'entrada', label: 'Entrada', direction: 'in' },
  { value: 'saida', label: 'Saída', direction: 'out' },
  { value: 'ajuste', label: 'Ajuste', direction: 'set' },
  { value: 'perda', label: 'Perda', direction: 'out' },
  { value: 'compra', label: 'Compra', direction: 'in' },
  { value: 'consumo', label: 'Consumo', direction: 'out' },
];

export const PAYMENT_METHODS = [
  { value: 'pix', label: 'Pix' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'credit', label: 'Crédito' },
  { value: 'debit', label: 'Débito' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'other', label: 'Outro' },
];

export const STOCK_STATUS = {
  normal: { label: 'Normal', tone: 'success' },
  low: { label: 'Baixo', tone: 'warning' },
  critical: { label: 'Crítico', tone: 'danger' },
};

export const STORAGE_KEYS = {
  session: 'nexus-food:session',
  company: 'nexus-food:company',
};
