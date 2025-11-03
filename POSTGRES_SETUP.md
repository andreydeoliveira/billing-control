# 🐘 Guia de Instalação do PostgreSQL no Windows

## Opção 1: Instalação Tradicional

### Passo 1: Download
1. Acesse: https://www.postgresql.org/download/windows/
2. Clique em "Download the installer"
3. Escolha a versão mais recente (recomendado: PostgreSQL 16)
4. Baixe o instalador para Windows x86-64

### Passo 2: Instalação
1. Execute o instalador baixado
2. Clique em "Next" para iniciar
3. Escolha o diretório de instalação (pode deixar o padrão)
4. Selecione os componentes (deixe todos marcados)
5. Escolha o diretório de dados (pode deixar o padrão)
6. **IMPORTANTE**: Defina uma senha para o usuário `postgres` (anote essa senha!)
7. Escolha a porta (deixe 5432 - padrão)
8. Escolha o locale (deixe o padrão)
9. Clique em "Next" e depois em "Install"
10. Aguarde a instalação completar

### Passo 3: Criar o Banco de Dados

Após a instalação, abra o PowerShell e execute:

```powershell
# Conectar ao PostgreSQL
psql -U postgres

# Dentro do psql, criar o banco:
CREATE DATABASE billing_control;

# Sair do psql:
\q
```

### Passo 4: Atualizar .env.local

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA_AQUI@localhost:5432/billing_control"
```

---

## Opção 2: Docker (Mais Rápido)

### Pré-requisito
- Docker Desktop instalado: https://www.docker.com/products/docker-desktop/

### Comando Único

```powershell
docker run --name billing-postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=billing_control `
  -p 5432:5432 `
  -d postgres:16-alpine
```

### Atualizar .env.local

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/billing_control"
```

### Comandos Úteis

```powershell
# Iniciar o container (se parado)
docker start billing-postgres

# Parar o container
docker stop billing-postgres

# Ver logs
docker logs billing-postgres

# Conectar ao PostgreSQL via terminal
docker exec -it billing-postgres psql -U postgres -d billing_control
```

---

## Opção 3: Serviço Online (Sem Instalação)

### Neon.tech (Recomendado)

1. Acesse: https://neon.tech
2. Crie uma conta gratuita
3. Clique em "Create Project"
4. Escolha um nome e região
5. Copie a connection string fornecida
6. Cole no `.env.local`:

```env
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

**Vantagens:**
- ✅ Sem instalação
- ✅ Gratuito
- ✅ Backups automáticos
- ✅ Pronto para deploy na Vercel

### Supabase

1. Acesse: https://supabase.com
2. Crie uma conta gratuita
3. Crie um novo projeto
4. Vá em Settings > Database
5. Copie a "Connection string" (modo "Session")
6. Cole no `.env.local`

**Vantagens:**
- ✅ Sem instalação
- ✅ Gratuito
- ✅ Inclui Auth, Storage, Realtime
- ✅ Interface visual para o banco

---

## Verificar se Está Funcionando

Depois de configurar, teste a conexão:

```powershell
npm run db:push
```

Se funcionar, você verá:
```
✓ Tables created successfully
```

---

## Recomendação

- **Para Desenvolvimento Local**: Use Docker (mais fácil e rápido)
- **Para Testar Rapidamente**: Use Neon.tech (sem instalação)
- **Para Produção**: Use Neon.tech ou Supabase (já está pronto para deploy)
