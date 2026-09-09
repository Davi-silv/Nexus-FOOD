/**
 * Auditoria estática das policies RLS (FASE 5).
 * Não exige Postgres rodando — valida o contrato SQL versionado.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '../../../supabase/migrations');

function readMigration(name) {
  return readFileSync(join(migrationsDir, name), 'utf8');
}

function allSql() {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readMigration(f))
    .join('\n');
}

const TENANT_TABLES = [
  'ingredients',
  'products',
  'recipes',
  'recipe_items',
  'inventory_movements',
  'suppliers',
  'supplier_products',
  'ingredient_price_history',
  'purchases',
  'purchase_items',
  'waste_records',
  'sales',
  'sale_items',
  'notifications',
  'finance_categories',
  'finance_transactions',
  'accounts_payable',
  'accounts_receivable',
  'companies',
  'company_users',
  'restaurant_settings',
  'subscriptions',
];

describe('SEC · FASE 5 RLS contract', () => {
  it('migration 008 existe e força RLS', () => {
    const sql = readMigration('008_rls_phase5_harden.sql');
    expect(sql).toContain('FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('REVOKE ALL ON TABLE');
    expect(sql).toContain('FROM anon');
    expect(sql).toContain('prevent_company_id_change');
    expect(sql).toContain('cruzando empresas');
  });

  it('todas as tabelas de tenant estão no FORCE RLS da 008', () => {
    const sql = readMigration('008_rls_phase5_harden.sql');
    for (const table of TENANT_TABLES) {
      expect(sql).toContain(`'${table}'`);
    }
  });

  it('helpers de membership/admin/permissão existem e são SECURITY DEFINER', () => {
    const sql = readMigration('002_rls_helpers.sql');
    for (const fn of [
      'is_platform_admin',
      'is_company_member',
      'is_company_admin',
      'company_has_permission',
    ]) {
      expect(sql).toContain(fn);
    }
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain('SET search_path = public');
    expect(sql).toContain('REVOKE ALL');
  });

  it('writes food exigem permissão de módulo (006)', () => {
    const sql = readMigration('006_security_harden_rls.sql');
    expect(sql).toContain('company_has_permission');
    expect(sql).toContain('WITH CHECK');
    expect(sql).toContain('prevent_self_platform_admin');
  });

  it('financeiro exige permissão finance (007)', () => {
    const sql = readMigration('007_finance_domain_rls.sql');
    expect(sql).toContain('company_has_permission');
    expect(sql).toContain("'finance'");
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('WITH CHECK');
  });

  it('triggers anti cross-tenant cobrem itens críticos', () => {
    const sql = readMigration('008_rls_phase5_harden.sql');
    for (const marker of [
      'enforce_recipe_item_company',
      'enforce_purchase_item_company',
      'enforce_sale_item_company',
      'enforce_supplier_product_company',
      'enforce_inventory_movement_company',
      'enforce_waste_company',
      'enforce_price_history_company',
      'enforce_recipe_company',
      'enforce_finance_category_company',
    ]) {
      expect(sql).toContain(marker);
    }
  });

  it('contrato agregado: ENABLE RLS + membership + sem service_role', () => {
    const sql = allSql().toLowerCase();
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('is_company_member');
    expect(sql).toContain('force row level security');
    expect(sql).not.toContain('service_role');
  });

  it('inventory_movements ganha previous_quantity/new_quantity', () => {
    const sql = readMigration('008_rls_phase5_harden.sql');
    expect(sql).toContain('previous_quantity');
    expect(sql).toContain('new_quantity');
  });
});
