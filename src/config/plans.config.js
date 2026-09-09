/**
 * Planos comerciais — feature flags (sem cobrança real no MVP).
 * Fonte de verdade futura: tabela plans + plan_features no Supabase.
 */
export const PLANS = {
  start: {
    slug: 'start',
    name: 'START',
    description: 'Gestão essencial para começar',
    priceMonthly: 79.9,
    features: [
      'dashboard',
      'products',
      'ingredients',
      'inventory',
      'finance',
      'users',
    ],
  },
  pro: {
    slug: 'pro',
    name: 'PRO',
    description: 'Custos, CMV e fornecedores',
    priceMonthly: 149.9,
    recommended: true,
    features: [
      'dashboard',
      'products',
      'ingredients',
      'recipes',
      'inventory',
      'suppliers',
      'purchases',
      'waste',
      'finance',
      'cmv',
      'reports',
      'users',
    ],
  },
  food_plus: {
    slug: 'food_plus',
    name: 'FOOD+',
    description: 'Preparado para PDV, delivery e IA',
    priceMonthly: 249.9,
    features: [
      'dashboard',
      'products',
      'ingredients',
      'recipes',
      'inventory',
      'suppliers',
      'purchases',
      'waste',
      'finance',
      'cmv',
      'reports',
      'users',
      'pdv_ready',
      'delivery_ready',
      'ai_ready',
    ],
  },
};

export function planHasFeature(planSlug, featureKey) {
  const plan = PLANS[planSlug] || PLANS.start;
  return plan.features.includes(featureKey);
}
