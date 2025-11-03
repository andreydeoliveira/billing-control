# 💰 Billing Control

Sistema de controle financeiro pessoal e familiar desenvolvido com Next.js 15, TypeScript, Mantine UI, Drizzle ORM e PostgreSQL.

## 🚀 Tecnologias

- **Next.js 15** - Framework React com App Router
- **TypeScript** - Linguagem de programação
- **Mantine UI** - Biblioteca de componentes
- **Drizzle ORM** - ORM para PostgreSQL
- **PostgreSQL** - Banco de dados relacional

## 📋 Funcionalidades

- ✅ Cadastro de usuários
- ✅ Criação de controles financeiros compartilhados
- ✅ Convite de usuários para controles financeiros
- 🔄 Cadastro de contas bancárias (com saldo inicial fixo)
- 🔄 Cadastro de cartões de crédito e débito
- 🔄 Cadastro de gastos e recebimentos provisionados
- 🔄 Lançamentos mensais
- 🔄 Transferências entre contas
- 🔄 Visão de 18 meses (anteriores e futuros)
- 🔄 Cálculo de saldo mensal

## 🏗️ Estrutura do Banco de Dados

### Tabelas Principais

- **users** - Usuários do sistema
- **financial_controls** - Controles financeiros (compartilhados entre usuários)
- **financial_control_users** - Relação many-to-many entre usuários e controles
- **bank_accounts** - Contas bancárias
- **cards** - Cartões de crédito e débito
- **categories** - Categorias de gastos/recebimentos
- **provisioned_transactions** - Gastos/recebimentos provisionados (templates)
- **monthly_transactions** - Lançamentos mensais (instâncias reais)
- **transfers** - Transferências entre contas

## 🛠️ Instalação e Configuração

### Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### Passos

1. **Clone o repositório**

```bash
git clone <url-do-repositorio>
cd billing-control
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure as variáveis de ambiente**

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local` com suas credenciais do PostgreSQL:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/billing_control"
```

4. **Execute as migrations do banco de dados**

```bash
npm run db:push
```

Ou gere as migrations:

```bash
npm run db:generate
npm run db:migrate
```

5. **Inicie o servidor de desenvolvimento**

```bash
npm run dev
```

Acesse http://localhost:3000

## 📦 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Compila o projeto para produção
- `npm run start` - Inicia o servidor em modo de produção
- `npm run lint` - Executa o linter
- `npm run db:generate` - Gera migrations do Drizzle
- `npm run db:migrate` - Executa migrations
- `npm run db:push` - Push do schema diretamente para o banco (dev)
- `npm run db:studio` - Abre o Drizzle Studio para visualizar o banco

## 🗂️ Estrutura de Pastas

```
billing-control/
├── src/
│   ├── app/                    # App Router do Next.js
│   │   ├── api/               # API Routes
│   │   │   ├── auth/         # Endpoints de autenticação
│   │   │   └── financial-controls/ # Endpoints de controles
│   │   ├── auth/             # Páginas de autenticação
│   │   ├── dashboard/        # Dashboard principal
│   │   └── control/          # Páginas de controle financeiro
│   └── db/                    # Banco de dados
│       ├── schema/           # Schema do Drizzle ORM
│       └── index.ts          # Configuração do banco
├── drizzle/                   # Migrations geradas
├── .env.local                # Variáveis de ambiente (não versionado)
├── .env.example              # Exemplo de variáveis
├── drizzle.config.ts         # Configuração do Drizzle
└── package.json
```

## 🚧 Próximos Passos

1. Implementar autenticação completa (NextAuth.js)
2. Criar páginas de gerenciamento de contas bancárias
3. Criar páginas de gerenciamento de cartões
4. Criar página de cadastro de gastos/recebimentos provisionados
5. Criar página principal com visão de 18 meses
6. Implementar funcionalidade de convite de usuários
7. Implementar transferências entre contas
8. Adicionar gráficos e visualizações
9. Deploy na Vercel

## 📝 Licença

Este projeto é privado e de uso pessoal.
