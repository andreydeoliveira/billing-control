# Migração do Banco Local para Vercel Postgres

## Passo 1: Criar Banco Vercel Postgres

1. Acesse: https://vercel.com/dashboard
2. Vá em **Storage** → **Create Database** → **Postgres**
3. Escolha nome (ex: `billing-control-db`) e região
4. Após criar, vá em **.env.local** e copie as credenciais

## Passo 2: Configurar Credenciais Localmente

Adicione ao arquivo `.env` (não commite este arquivo!):

```env
# Banco Vercel Postgres
VERCEL_DATABASE_URL="postgres://default:XXXXX@XXXXX-pooler.XXXXX.vercel-storage.com/verceldb?sslmode=require"
```

## Passo 3: Instalar Dependência (se necessário)

```bash
npm install pg
```

## Passo 4: Criar Estrutura do Banco no Vercel

Primeiro, atualize temporariamente o `.env` para rodar as migrations no Vercel:

```bash
# Comente o DATABASE_URL atual e use o Vercel temporariamente
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billing_control"
DATABASE_URL="${VERCEL_DATABASE_URL}"
```

Depois rode o push do Drizzle para criar todas as tabelas:

```bash
npm run db:push
```

## Passo 5: Migrar os Dados

Agora volte o `.env` para o banco local:

```env
# Descomente novamente
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billing_control"

# Mantenha também:
VERCEL_DATABASE_URL="postgres://..."
```

Execute o script de migração de dados:

```bash
node migrate-to-vercel.js
```

Este script irá:
- Conectar nos dois bancos
- Copiar todos os dados do local para o Vercel
- Mostrar progresso em tempo real

## Passo 6: Trocar para o Banco Vercel Definitivamente

No arquivo `.env`, **comente** a URL local e use a do Vercel:

```env
# Database Local (Docker) - COMENTADO
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billing_control"

# Database Vercel Postgres - ATIVO
DATABASE_URL="${VERCEL_DATABASE_URL}"
```

Ou diretamente:

```env
DATABASE_URL="postgres://default:XXXXX@XXXXX-pooler.XXXXX.vercel-storage.com/verceldb?sslmode=require"
```

## Passo 7: Testar Localmente

```bash
npm run dev
```

Acesse http://localhost:3000 e verifique se seus dados estão lá.

## Passo 8: Deploy na Vercel

1. Faça commit das mudanças (exceto .env!)
2. Push para o GitHub
3. A Vercel fará deploy automaticamente
4. Configure as variáveis de ambiente na Vercel:
   - Vá em **Settings** → **Environment Variables**
   - Adicione `DATABASE_URL` com a connection string do Vercel Postgres
   - Adicione `NEXTAUTH_URL` com a URL do seu site (ex: `https://seu-app.vercel.app`)
   - Adicione `AUTH_SECRET` (mesmo valor do .env local)

## Observações Importantes

- ✅ Mantenha o arquivo `database-backup.sql` como backup
- ✅ O Vercel Postgres já vem configurado com SSL
- ✅ Não commite arquivos `.env` com credenciais
- ✅ Use variáveis de ambiente na Vercel para produção

## Troubleshooting

### Erro ao exportar dados
- Verifique se o container Docker está rodando: `docker ps`
- Confirme o nome do container: `billing-control-db`
- Se o nome for diferente, edite `export-database.js` e altere a variável `DOCKER_CONTAINER`

### Erro de conexão ao importar
- Verifique se `VERCEL_DATABASE_URL` está correto
- Teste a conexão: `psql $VERCEL_DATABASE_URL`

### Dados não aparecem após importar
- Verifique se o script rodou sem erros
- Conecte ao banco Vercel e liste as tabelas:
  ```sql
  \dt
  ```
