# 🚀 Guia de Início Rápido - Billing Control

Este guia vai te ajudar a configurar e rodar o projeto pela primeira vez.

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js 18+** - [Download](https://nodejs.org/)
- **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)

## Passo 1: Configurar o PostgreSQL

1. Certifique-se de que o PostgreSQL está rodando
2. Crie um banco de dados chamado `billing_control`:

```sql
CREATE DATABASE billing_control;
```

Ou usando o comando:
```bash
psql -U postgres -c "CREATE DATABASE billing_control;"
```

## Passo 2: Configurar Variáveis de Ambiente

1. Copie o arquivo de exemplo:
```bash
copy .env.example .env.local
```

2. Edite o arquivo `.env.local` e atualize a string de conexão do PostgreSQL:

```env
DATABASE_URL="postgresql://seu_usuario:sua_senha@localhost:5432/billing_control"
```

Exemplo:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billing_control"
```

## Passo 3: Instalar Dependências

```bash
npm install
```

## Passo 4: Criar Tabelas no Banco de Dados

Execute o comando para criar as tabelas:

```bash
npm run db:push
```

Este comando vai criar todas as tabelas no banco de dados baseado no schema definido.

## Passo 5: Iniciar o Servidor

```bash
npm run dev
```

O servidor vai iniciar em http://localhost:3000

## 🎉 Pronto!

Agora você pode:

1. **Acessar a aplicação**: http://localhost:3000
2. **Criar sua conta**: Clique em "Criar Conta"
3. **Criar um controle financeiro**: Após o login, crie seu primeiro controle
4. **Explorar o dashboard**: Veja seus controles e comece a usar!

## 📊 Ferramentas Úteis

### Drizzle Studio
Para visualizar e editar dados no banco de forma visual:

```bash
npm run db:studio
```

Isso abrirá o Drizzle Studio em https://local.drizzle.studio

### Gerar Migrations
Se você modificar o schema e quiser gerar migrations SQL:

```bash
npm run db:generate
```

As migrations serão salvas na pasta `drizzle/`

### Executar Migrations
Para executar migrations geradas:

```bash
npm run db:migrate
```

## 🐛 Problemas Comuns

### Erro de Conexão com o Banco
- Verifique se o PostgreSQL está rodando
- Confirme o usuário, senha e porta no `.env.local`
- Teste a conexão manualmente: `psql -U seu_usuario -d billing_control`

### Porta 3000 Já em Uso
Se a porta 3000 já estiver em uso, você pode usar outra porta:
```bash
PORT=3001 npm run dev
```

### Dependências Não Instaladas
Se houver erros de módulos não encontrados:
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📚 Próximos Passos

Agora que o projeto está rodando, você pode:

1. Ver o arquivo `IMPLEMENTATION_STATUS.md` para entender o que já foi feito
2. Começar a implementar as funcionalidades faltantes
3. Seguir o roadmap definido na documentação

## 💡 Dicas

- Use o Drizzle Studio para visualizar os dados enquanto desenvolve
- Mantenha o `.env.local` seguro e nunca o commite no Git
- Execute `npm run db:push` sempre que modificar o schema durante o desenvolvimento
- Para produção, use migrations (`db:generate` e `db:migrate`) ao invés de `db:push`

---

**Dúvidas?** Consulte o `README.md` para mais detalhes.
