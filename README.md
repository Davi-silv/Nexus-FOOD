# Nexus Food

<div align="center">

### Você vende. O Nexus mostra onde está o lucro.

**Plataforma de gestão para restaurantes, hamburguerias, lanchonetes e pizzarias.**

[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_%2B_PostgreSQL-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-Instal%C3%A1vel-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/learn/pwa)
[![Vitest](https://img.shields.io/badge/Testes-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

**[Código-fonte](https://github.com/Davi-silv/Nexus-FOOD)** · **[Arquitetura](ARCHITECTURE.md)** · **[Portfólio](https://portifolio-future.vercel.app/)**

</div>

---

## Sobre o projeto

O **Nexus Food** é um projeto da **Evolutiva Tech**, desenvolvido com foco na gestão operacional e financeira de pequenos estabelecimentos alimentícios. Reúne **custos, estoque, compras, desperdícios, indicadores e financeiro** para apoiar decisões do restaurante.

O MVP prioriza a **gestão**, não um sistema de ponto de venda (PDV). A arquitetura contempla diferentes empresas (multiempresa), permissões por perfil e integração com Supabase.

> **Modos de uso:** o sistema oferece um **modo de demonstração local** com dados fictícios da Hamburgueria Nexus, sem configuração de Supabase. A operação em nuvem requer configuração do Supabase, aplicação das migrações e validação das políticas de acesso antes de receber dados reais.

## Funcionalidades documentadas

| Área | Funcionalidades |
| --- | --- |
| **Multiempresa** | Organização dos dados por restaurante e identidade visual por empresa |
| **Ingredientes e produtos** | Cadastro e gerenciamento de insumos e produtos |
| **Fichas técnicas** | Composição de produtos e análise de custos |
| **Estoque** | Movimentações e acompanhamento de insumos |
| **Fornecedores e compras** | Gerenciamento de fornecedores e compras |
| **Desperdícios** | Registros de perdas |
| **Financeiro** | Acompanhamento de informações financeiras |
| **Dashboard e relatórios** | Indicadores gerenciais e relatórios |
| **Usuários e permissões** | Administração do restaurante, funcionários e administração da plataforma |
| **Configurações** | Parâmetros de CMV, perfil e identidade visual |
| **Cadastro público** | Fluxo de criação de contas |
| **PWA responsivo** | Interface adaptada a celular, tablet e desktop |

As áreas acima estão documentadas como entregues no README anterior. O funcionamento de recursos individuais depende do modo de execução e da configuração do ambiente.

## Tecnologias

- **Front-end:** React 19, JavaScript, React Router e Lucide React.
- **Visualização de dados:** Recharts.
- **Build:** Vite 8.
- **Nuvem:** Supabase (Auth, PostgreSQL e Row Level Security).
- **Qualidade:** Vitest, React Testing Library e oxlint.
- **PWA:** `vite-plugin-pwa`.

## Arquitetura

O projeto separa interface, contextos, serviços, configuração e integração com dados.

```text
src/
├── components/    # Interface, layout e navegação
├── pages/         # Autenticação, restaurante e administração
├── contexts/      # Contextos da aplicação
├── services/      # Serviços e regras de negócio
├── lib/           # Cliente Supabase
├── config/        # Perfis, planos e configurações
├── core/          # Utilitários e constantes
├── data/          # Dados de demonstração
├── styles/        # Estilos
├── types/         # Tipos documentados
└── tests/         # Testes
supabase/
└── migrations/    # Esquema SQL e políticas de segurança
```

### Multiempresa e controle de acesso

Os dados comerciais são associados a um `company_id`. O repositório inclui migrações com políticas de **Row Level Security (RLS)** para isolamento no Supabase.

| Perfil | Papel |
| --- | --- |
| `platform_super_admin` | Administração da plataforma |
| `company_admin` | Gestão do restaurante |
| `employee` | Permissões específicas por módulo |

Há configurações para planos **START**, **PRO** e **FOOD+** em `src/config/plans.config.js`.

Leia a **[documentação de arquitetura](ARCHITECTURE.md)**.

## Executar localmente

**Pré-requisitos:** Node.js e npm compatíveis com o projeto.

```bash
git clone https://github.com/Davi-silv/Nexus-FOOD.git
cd Nexus-FOOD
npm install
npm run dev
```

### Modo de demonstração

Sem Supabase configurado em `.env.local`, o aplicativo inicia em **modo demo local**, usando o cenário fictício **Hamburgueria Nexus**. Há perfis de teste para administração do restaurante, funcionário e administração da plataforma.

> Credenciais de demonstração não devem ser reutilizadas em produção.

### Configuração com Supabase

1. Copie `.env.example` para `.env.local`.
2. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Aplique as migrações em [`supabase/migrations/`](supabase/migrations/) na sequência numérica.
4. Valide autenticação, papéis e políticas RLS antes de usar dados reais.

```bash
cp .env.example .env.local
npm run dev
```

**Segurança:** nunca exponha `service_role_key` no front-end. A chave pública anon não substitui a configuração adequada das políticas RLS.

## Qualidade e testes

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Visualização do build |
| `npm run lint` | Análise estática com oxlint |
| `npm test` | Testes com Vitest |
| `npm run test:watch` | Testes em modo de acompanhamento |
| `npm run test:security` | Suíte de segurança |

A suíte [`src/tests/security/`](src/tests/security/) contém verificações sobre permissões, isolamento multiempresa, XSS, segredos e RLS. A presença desses testes não equivale a uma auditoria completa de produção.

## PWA e responsividade

O projeto inclui manifesto, service worker e ícones em `public/icons/`, com interface responsiva para dispositivos móveis, tablets e desktops.

```bash
npm run build
npm run preview
```

## Documentação e referências

- [Arquitetura e decisões técnicas](ARCHITECTURE.md)
- [Migrações SQL e políticas RLS](supabase/migrations/)
- [Código da aplicação](src/)
- [Exemplo de configuração de ambiente](.env.example)

## Autoria

Desenvolvido por **Davi Barbosa da Silva**, desenvolvedor de software e fundador da **Evolutiva Tech**.

**[GitHub](https://github.com/Davi-silv)** · **[Portfólio](https://portifolio-future.vercel.app/)** · **[LinkedIn](https://www.linkedin.com/in/davi-barbosa-silva/)**

---

<div align="center"><sub>Nexus Food · Evolutiva Tech · Gestão orientada a dados</sub></div>
