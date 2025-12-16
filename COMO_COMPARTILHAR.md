# 🚀 Como Compartilhar o Projeto

## 📦 Opção 1: Compartilhar via GitHub (Recomendado)

### Para você (dono do projeto):

1. **Criar repositório no GitHub:**
```bash
# Se ainda não tem git inicializado
git init
git add .
git commit -m "Sistema de controle financeiro com autenticação"

# Criar repo no GitHub e depois:
git remote add origin https://github.com/seu-usuario/billing-control.git
git branch -M main
git push -u origin main
```

2. **Proteger informações sensíveis:**
Certifique-se que o `.gitignore` já contém:
```
.env
.env.local
.env.production
node_modules/
.next/
```

3. **Criar arquivo `.env.example`:**
```env
# Banco de dados (Neon/Vercel Postgres)
POSTGRES_PRISMA_URL="postgresql://..."
POSTGRES_URL_NON_POOLING="postgresql://..."

# Ambiente
NODE_ENV="development"
```

### Para a outra pessoa:

1. **Clonar o repositório:**
```bash
git clone https://github.com/seu-usuario/billing-control.git
cd billing-control
```

2. **Instalar dependências:**
```bash
npm install
```

3. **Configurar banco de dados:**
- Criar conta no [Vercel](https://vercel.com) ou [Neon](https://neon.tech)
- Criar um banco PostgreSQL
- Copiar `.env.example` para `.env`
- Adicionar as URLs de conexão no `.env`

4. **Aplicar migrations:**
```bash
npx prisma db push
# ou
npx prisma migrate dev
```

5. **Rodar o projeto:**
```bash
npm run dev
```

6. **Criar primeiro usuário:**
- Acessar `http://localhost:3000/auth/signup`
- Criar conta com email e senha (mínimo 12 caracteres)

---

## 💻 Opção 2: Deploy na Vercel (Compartilhar online)

### Passos:

1. **Push para GitHub** (seguir Opção 1)

2. **Deploy na Vercel:**
   - Acessar [vercel.com](https://vercel.com)
   - Conectar com GitHub
   - Importar o repositório
   - Configurar variáveis de ambiente:
     - `POSTGRES_PRISMA_URL`
     - `POSTGRES_URL_NON_POOLING`
     - `NODE_ENV=production`

3. **Aplicar migrations no banco de produção:**
```bash
npx prisma migrate deploy
```

4. **Compartilhar URL:**
   - Vercel gera URL tipo: `https://seu-projeto.vercel.app`
   - Compartilhe esta URL
   - Cada pessoa cria sua própria conta

---

## 📁 Opção 3: Compartilhar código localmente (ZIP)

### ⚠️ NÃO INCLUIR:
- Pasta `node_modules/`
- Pasta `.next/`
- Arquivo `.env`
- Arquivos de banco SQLite

### Para compartilhar:

1. **Você:** Comprimir apenas código fonte:
```bash
# PowerShell
Compress-Archive -Path app, components, lib, prisma, public, *.ts, *.json, *.md -DestinationPath billing-control.zip
```

2. **Outra pessoa:** 
```bash
# Descompactar
# Abrir terminal na pasta
npm install
# Criar arquivo .env com credenciais do banco
npx prisma db push
npm run dev
```

---

## 🔐 Segurança ao Compartilhar

### ✅ PODE compartilhar:
- Todo o código fonte
- `schema.prisma`
- `.env.example`
- Documentação

### ❌ NUNCA compartilhar:
- Arquivo `.env` (contém senhas do banco!)
- Pasta `node_modules/`
- Senhas de usuários
- Tokens de API
- Credenciais do banco de dados

---

## 👥 Acesso Multi-usuário

### Como funciona:
- ✅ Cada pessoa cria sua **própria conta**
- ✅ Cada usuário vê apenas seus dados
- ⚠️ Banco de dados é **compartilhado** (todos os usuários no mesmo banco)
- ⚠️ Sistema atual **NÃO tem multi-tenancy** (separação entre usuários)

### Para criar acesso compartilhado (mesmos dados):
Compartilhe **email e senha** de uma conta (não recomendado para produção)

### Para acesso isolado (cada um com seus dados):
Seria necessário:
1. Adicionar campo `userId` em todas as tabelas
2. Filtrar queries por usuário logado
3. Implementar multi-tenancy

---

## 🆘 Problemas Comuns

### "Erro de conexão com banco"
- Verificar se URL do banco está correta no `.env`
- Confirmar que banco está ativo (Neon pode entrar em sleep)
- Testar conexão: `npx prisma db push`

### "Erro ao fazer login"
- Confirmar que migrations foram aplicadas
- Verificar se tabelas `User` e `Session` existem
- Criar novo usuário em `/auth/signup`

### "Cookie não persiste"
- Em localhost, cookies funcionam normalmente
- Em produção, usar HTTPS (Vercel faz isso automaticamente)
- Verificar se `NODE_ENV=production` está setado

---

## 📞 Comandos Úteis

```bash
# Ver status do banco
npx prisma studio

# Resetar banco (CUIDADO: apaga tudo)
npx prisma migrate reset

# Ver logs do servidor
npm run dev

# Build para produção
npm run build
npm start
```

---

## 🎯 Resumo Rápido

**Para compartilhar código:**
1. Push para GitHub
2. Compartilhe link do repositório
3. Outra pessoa clona e configura `.env`

**Para compartilhar acesso online:**
1. Deploy na Vercel
2. Compartilhe URL
3. Cada pessoa cria conta própria

**Para ambos:**
- Nunca compartilhe arquivo `.env`
- Cada pessoa precisa de seu próprio banco OU
- Todos usam o mesmo banco (compartilhado)
