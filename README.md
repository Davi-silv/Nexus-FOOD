# Nexus Food

**Você vende. O Nexus mostra onde está o lucro.**

SaaS multiempresa para hamburguerias, lanchonetes, pizzarias e pequenos restaurantes.
Foco do MVP: **gestão + custos + estoque + financeiro + inteligência** (não PDV).

Marca: **Evolutiva Tech**

## Stack

- React 19 + JavaScript (Vite)
- React Router
- Recharts
- Supabase (Auth + PostgreSQL + RLS) — opcional no MVP (modo demo local)

## Como rodar

```bash
npm install
npm run dev
```

Sem `.env.local` com Supabase, o app inicia em **modo demo** com a Hamburgueria Nexus.

### Contas demo

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Admin restaurante | `admin@nexusfood.local` | `admin` |
| Funcionário (sem financeiro) | `estoque@nexusfood.local` | `estoque` |
| Super Admin | `super@evolutivatech.com.br` | `super` |

### Cloud (Supabase)

1. Copie `.env.example` → `.env.local`
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
3. Aplique as migrations em `supabase/migrations/`

## Arquitetura

Ver [ARCHITECTURE.md](./ARCHITECTURE.md).

## Fases

| Fase | Status |
|------|--------|
| 1 Análise Nexus ERP | ✅ |
| 2 Relatório / plano | ✅ |
| 3 Multiempresa + shell React | ✅ (esta entrega) |
| 4 Migrations core + food | ✅ (SQL criado) |
| 5 CRUD ingredientes | ✅ |
| 6 CRUD produtos | ✅ |
| 7 Ficha técnica | ✅ |
| 8 Estoque | ✅ |
| 9 Fornecedores | ✅ |
| 10 Compras | ✅ |
| 11 Desperdícios | ✅ |
| 12 Financeiro | ✅ |
| 13 Dashboard (dados reais) | ✅ |
| 14 Relatórios | ✅ |
| 15 Super Admin | ✅ |
| 16 Segurança / RLS finance | ✅ |
| 17 Fluxo E2E MVP | ✅ |
| Usuários (restaurante) | ✅ |
| Configurações (CMV / perfil) | ✅ |
| Identidade visual por empresa | ✅ |
| Cadastro público de novos usuários | ✅ |
| PWA responsivo | ✅ |

## PWA

O app é instalável (Progressive Web App):

```bash
npm run build && npm run preview
```

- Manifest + service worker (cache de assets / fontes)
- Ícones em `public/icons/`
- Banner “Instalar” no Chrome/Edge/Android
- Layout adaptado a mobile, tablet e desktop (safe-area em notch)

```bash
npm run test:security
```

Suíte em `src/tests/security/` (privilege escalation, multiempresa, XSS, secrets, RLS).

Nunca coloque `service_role_key` no frontend. Use apenas `VITE_SUPABASE_ANON_KEY`.
