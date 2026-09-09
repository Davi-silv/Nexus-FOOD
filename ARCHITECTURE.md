# Arquitetura — Nexus Food

## Princípios

- **Multiempresa:** todo dado comercial carrega `company_id`. Isolamento real via RLS no Supabase; filtro reforçado no client.
- **Incremental:** módulos food entram por fase sem reescrever o shell.
- **Separação:** UI / contexts / services / config / data / migrations.
- **Não reinventar:** padrões de auth, planos e RLS inspirados no Nexus ERP (`workspace` → `company`).

## Pastas

```
src/
  config/       branding, planos, roles, navegação, supabase
  core/         constants + utils
  contexts/     Auth, Toast
  components/   ui + layout + routing
  pages/        auth | restaurant | admin
  services/     auth, company, recipe (domínio puro)
  lib/          cliente Supabase
  data/         seed demo
  styles/       design system
  types/        JSDoc de domínio
supabase/migrations/
```

## Perfis

| Role | Escopo |
|------|--------|
| `platform_super_admin` | Evolutiva Tech — métricas de plataforma |
| `company_admin` | Restaurante — gestão completa |
| `employee` | Permissões por módulo (ex.: sem financeiro) |

## Planos (feature flags)

`START` → `PRO` → `FOOD+` em `src/config/plans.config.js` + tabela `plans`.

## Domínio food (SQL)

ingredients · products · recipes · recipe_items · inventory_movements ·
suppliers · purchases · waste_records · sales · ingredient_price_history

## Segurança

- Nunca expor `service_role_key` no frontend
- Apenas `VITE_SUPABASE_ANON_KEY`
- RLS obrigatório antes de produção cloud
