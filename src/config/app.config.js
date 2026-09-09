/**
 * Configuração central do produto Nexus Food.
 */
import { isSupabaseEnabled } from './supabase.config.js';

export const APP_CONFIG = {
  name: 'Nexus Food',
  shortName: 'Nexus',
  brand: 'Evolutiva Tech',
  slogan: 'Você vende. O Nexus mostra onde está o lucro.',
  version: '0.1.0',
  locale: 'pt-BR',
  currency: 'BRL',
  supportEmail: 'suporte@evolutivatech.com.br',

  features: {
    cloudSync: isSupabaseEnabled,
    demoMode: !isSupabaseEnabled,
    billing: false,
    pdv: false,
    fiscal: false,
    ifood: false,
    kds: false,
    ai: false,
  },
};
