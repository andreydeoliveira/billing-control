# 💰 Billing Control

Sistema de controle financeiro pessoal e familiar desenvolvido com Next.js 15, TypeScript, Mantine UI, Drizzle ORM e PostgreSQL.

## 🚀 Tecnologias

- **Next.js 16.0.1** - Framework React com App Router
- **React 19.2.0** - Biblioteca para interfaces
- **TypeScript** - Linguagem de programação tipada
- **Mantine UI v7** - Biblioteca de componentes
- **Drizzle ORM** - ORM TypeScript para PostgreSQL
- **PostgreSQL 16** - Banco de dados relacional
- **NextAuth v5** - Autenticação com JWT
- **dayjs** - Manipulação de datas
- **Docker** - Containerização do PostgreSQL

## 📋 Funcionalidades

### Autenticação e Controles
- ✅ Cadastro de usuários
- ✅ Autenticação com NextAuth v5 (JWT)
- ✅ Criação de controles financeiros compartilhados
- ✅ Convite de usuários para controles financeiros

### Contas e Cartões
- ✅ Cadastro de contas bancárias (com saldo inicial fixo)
- ✅ Cadastro de cartões de crédito e débito
- ✅ Vinculação de cartões a contas bancárias
- ✅ Gestão de limites de crédito e dias de vencimento

### Transações Provisionadas
- ✅ Cadastro de gastos e recebimentos provisionados (templates)
- ✅ Suporte a transações recorrentes (mensais)
- ✅ Suporte a transações parceladas (N parcelas)
- ✅ **Auto-geração de transações mensais** (12 meses para recorrentes, N meses para parceladas)
- ✅ **Exclusão inteligente** com opções: todas, apenas não pagas, ou por período

### Visões Mensais
- ✅ Visão de 18 meses (6 anteriores + mês atual + 11 futuros)
- ✅ Cálculo automático de saldo mensal por conta
- ✅ Visualização de transações mensais
- ✅ **Exibição de nome do cartão** nas transações de cartão de crédito
- ✅ **Duplo clique** em transação de cartão abre detalhes da fatura
- ✅ Transferências entre contas
- ✅ Gestão de faturas de cartão de crédito

### Faturas de Cartão
- ✅ Geração automática de faturas mensais
- ✅ Cálculo de valor total da fatura
- ✅ Listagem de transações por fatura
- ✅ **Edição de valores de transações** (confirmar valor real pago)
- ✅ Marcação de data de pagamento
- ✅ Recálculo automático do total da fatura

### Projeção Financeira
- ✅ Projeção de 6 meses futuros
- ✅ Cálculo de saldo projetado por conta
- ✅ Geração de transações futuras a partir de provisionados

## 🏗️ Estrutura do Banco de Dados

### Tabelas Principais

- **users** - Usuários do sistema
- **financial_controls** - Controles financeiros (compartilhados entre usuários)
- **financial_control_users** - Relação many-to-many entre usuários e controles
- **bank_accounts** - Contas bancárias (saldo inicial fixo)
- **cards** - Cartões de crédito e débito (vinculados a contas)
- **categories** - Categorias de gastos/recebimentos
- **provisioned_transactions** - Templates de transações (recorrentes ou parceladas)
- **monthly_transactions** - Instâncias mensais de transações (FK para provisioned_transactions)
- **card_invoices** - Faturas mensais de cartões de crédito
- **transfers** - Transferências entre contas bancárias

### Relacionamentos Importantes

- `monthly_transactions.provisionedTransactionId` → `provisioned_transactions.id` (nullable, onDelete: 'set null')
  - Permite exclusão de template sem perder histórico de transações pagas
- `monthly_transactions.cardInvoiceId` → `card_invoices.id` (nullable, onDelete: 'set null')
  - Vincula transações de cartão à fatura correspondente
- `cards.bankAccountId` → `bank_accounts.id`
  - Cartão vinculado à conta que paga a fatura

## 🛠️ Instalação e Configuração

### Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
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

Edite o arquivo `.env.local` com as configurações necessárias:

```env
# Database (local com Docker)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billing_control"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="sua-chave-secreta-aqui"
```

4. **Inicie o PostgreSQL com Docker**

```bash
docker-compose up -d
```

Isso iniciará um container PostgreSQL 16-alpine na porta 5432.

5. **Execute as migrations do banco de dados**

```bash
npm run db:push
```

Ou gere e execute migrations:

```bash
npm run db:generate
npm run db:migrate
```

6. **Inicie o servidor de desenvolvimento**

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

## 🐳 Docker

O projeto inclui `docker-compose.yml` para facilitar o desenvolvimento local:

```bash
# Iniciar PostgreSQL
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar containers
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados)
docker-compose down -v
```

Container PostgreSQL:
- **Image**: postgres:16-alpine
- **Porta**: 5432
- **Database**: billing_control
- **User**: postgres
- **Password**: postgres
- **Volume**: `./postgres-data` (persistência local)

## 🗂️ Estrutura de Pastas

```
billing-control/
├── src/
│   ├── app/                       # App Router do Next.js
│   │   ├── api/                  # API Routes
│   │   │   ├── auth/            # Endpoints de autenticação (NextAuth)
│   │   │   └── financial-controls/ # Endpoints de controles financeiros
│   │   │       ├── [id]/        # Rotas por controle
│   │   │       │   ├── accounts/         # Contas bancárias
│   │   │       │   ├── cards/            # Cartões
│   │   │       │   ├── categories/       # Categorias
│   │   │       │   ├── monthly-view/     # Visão mensal
│   │   │       │   ├── monthly-transactions/ # Transações mensais
│   │   │       │   ├── provisioned-transactions/ # Transações provisionadas
│   │   │       │   ├── transfers/        # Transferências
│   │   │       │   └── card-invoices/    # Faturas de cartão
│   │   ├── auth/                 # Páginas de autenticação (login, cadastro)
│   │   ├── dashboard/            # Dashboard principal
│   │   └── control/              # Páginas de controle financeiro
│   │       └── [id]/            # Páginas dinâmicas por controle
│   ├── components/               # Componentes React
│   │   ├── auth/                # Componentes de autenticação
│   │   └── control/             # Componentes de controle financeiro
│   │       ├── MonthlyView.tsx  # Visão mensal (transações, faturas, saldos)
│   │       ├── ProvisionedTransactions.tsx # Gestão de provisionados
│   │       ├── InvoiceDetails.tsx # Detalhes e edição de fatura
│   │       └── ...
│   ├── db/                       # Banco de dados
│   │   ├── schema/              # Schema do Drizzle ORM
│   │   │   ├── users.ts
│   │   │   ├── financial-controls.ts
│   │   │   ├── bank-accounts.ts
│   │   │   ├── cards.ts
│   │   │   ├── transactions.ts
│   │   │   └── ...
│   │   └── index.ts             # Configuração do banco
│   └── auth.ts                   # Configuração do NextAuth v5
├── drizzle/                      # Migrations geradas
├── postgres-data/                # Dados do PostgreSQL (Docker volume, não versionado)
├── .env.local                    # Variáveis de ambiente (não versionado)
├── .env.example                  # Exemplo de variáveis
├── docker-compose.yml            # Configuração do Docker
├── drizzle.config.ts            # Configuração do Drizzle
└── package.json
```

## 🚧 Recursos Destacados

### 🎯 Auto-geração de Transações
Ao criar um gasto provisionado, as transações mensais são geradas automaticamente:
- **Recorrentes**: Gera 12 meses de transações
- **Parceladas**: Gera todas as N parcelas

Não é mais necessário clicar em "Gerar previsão do mês"!

### 🗑️ Exclusão Inteligente
Ao excluir um gasto provisionado, você tem 3 opções:
1. **Remover apenas não pagas** (padrão) - Preserva histórico de transações pagas
2. **Remover TODAS** - Remove tudo, incluindo transações pagas
3. **Remover por período** - Remove transações de um intervalo específico (ex: 2025-01 a 2025-06)

### ✏️ Edição de Faturas
Nas faturas de cartão de crédito, você pode:
- Editar o valor de cada transação (ex: ajustar desconto)
- Definir a data de pagamento
- Ver recálculo automático do total da fatura

### 💳 Navegação Intuitiva
- Transações de cartão exibem o nome do cartão (ex: "Nubank") em vez do nome da despesa
- Duplo clique em transação de cartão abre os detalhes da fatura
- Menu lateral organizado por ordem de uso

## 🔜 Próximos Passos

1. ✅ ~~Implementar autenticação completa (NextAuth.js)~~
2. ✅ ~~Criar páginas de gerenciamento de contas bancárias~~
3. ✅ ~~Criar páginas de gerenciamento de cartões~~
4. ✅ ~~Criar página de cadastro de gastos/recebimentos provisionados~~
5. ✅ ~~Criar página principal com visão de 18 meses~~
6. ✅ ~~Implementar funcionalidade de convite de usuários~~
7. ✅ ~~Implementar transferências entre contas~~
8. 🔄 Adicionar gráficos e visualizações
9. 🔄 Implementar relatórios e exportação
10. 🔄 Deploy na Vercel

## 📝 Licença

Este projeto é privado e de uso pessoal.
