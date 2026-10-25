# Sync. — Como publicar (deploy)

Três serviços gratuitos:

| Parte | Onde | Endereço final |
|---|---|---|
| Banco de dados + login com Google | **Supabase** | `https://<projeto>.supabase.co` |
| Back-end (API em Python) | **Render** | `https://sync-api-xxxx.onrender.com` |
| Front-end (o app) | **Vercel** | `https://<seu-app>.vercel.app` |

> **Regra de ouro:** senhas e chaves só vão nos painéis desses serviços (variáveis de ambiente). Nunca no código, nunca no GitHub.

A ordem importa, porque cada passo usa um endereço do passo anterior.

---

## 1. GitHub

1. Em github.com → **New repository** → nome `sync`, **Public**, **sem** README, .gitignore ou licença.
2. Envie o código:
   ```bash
   git remote add origin https://github.com/<seu-usuario>/sync.git
   git push -u origin main
   ```
3. Na aba **Actions** do repositório, o CI roda sozinho (lint e testes). Ele precisa ficar verde.

## 2. Supabase (banco + login)

1. supabase.com → **New project**.
   - **Region: East US (Ohio)**, a mesma região do Render (`render.yaml`), porque cada consulta ao banco atravessa essa distância.
   - Crie uma senha forte para o banco e **guarde** (ela vai na `DATABASE_URL`).
2. **Endereço do banco**: botão **Connect** (no topo) → **Session pooler** → copie a URI:
   ```
   postgresql://postgres.<ref>:<SENHA>@aws-0-us-east-2.pooler.supabase.com:5432/postgres
   ```
   Use o **Session pooler**: a conexão direta só funciona por IPv6, e o Render gratuito usa IPv4. Troque `<SENHA>` pela senha do banco.
3. **Endereço e chave do projeto**: **Project Settings → API**: copie a **Project URL** e a chave **anon / publishable** (ela é pública; vai para o front).
4. **Chaves de assinatura do login**: **Project Settings → JWT Keys**. Precisa estar usando **JWT Signing Keys** (chave assimétrica). Se aparecer só "Legacy JWT secret", clique para migrar e depois **rotacione** para a chave nova. O back confere o login pelas chaves públicas do projeto.

## 3. Login com Google

1. **Google Cloud Console** (console.cloud.google.com) → crie um projeto.
2. **APIs & Services → OAuth consent screen**: tipo **External**, nome "Sync.", seu e-mail. Em **Test users**, adicione os e-mails que podem entrar (enquanto o app estiver em modo de teste, só eles entram).
3. **Credentials → Create credentials → OAuth client ID** → tipo **Web application**:
   - **Authorized redirect URIs**: `https://<projeto>.supabase.co/auth/v1/callback`
4. Copie o **Client ID** e o **Client secret**.
5. No Supabase: **Authentication → Sign In / Providers → Google** → ative e cole os dois.

## 4. Render (back-end)

1. render.com → entre com o GitHub → **New → Blueprint** → escolha o repositório `sync`. Ele lê o arquivo `render.yaml`.
2. Preencha as variáveis pedidas:
   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | a URI do Session pooler (passo 2.2) |
   | `SUPABASE_URL` | `https://<projeto>.supabase.co` |
   | `CORS_ORIGINS` | por enquanto `["http://localhost:5173"]` (a Vercel entra no passo 6) |
   | `CORS_ORIGIN_REGEX` | deixe vazio |
3. **Apply**. O primeiro deploy demora alguns minutos: ele instala o Python 3.14, cria as tabelas (migrações) e sobe a API.
4. Teste: abra `https://sync-api-xxxx.onrender.com/health` → `{"status":"ok"}`. Abra também `/docs`.

O plano gratuito **dorme** depois de 15 min sem uso; a primeira requisição depois disso demora ~1 min.

## 5. Vercel (front-end)

1. vercel.com → entre com o GitHub → **Add New → Project** → importe `sync`.
2. **Root Directory: `frontend`** (importante). O resto ele detecta (Vite).
3. **Environment Variables**:
   | Variável | Valor |
   |---|---|
   | `VITE_API_URL` | `https://sync-api-xxxx.onrender.com` (sem barra no fim) |
   | `VITE_SUPABASE_URL` | `https://<projeto>.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | a chave anon/publishable |
4. **Deploy**. Anote o endereço, ex.: `https://sync-andressa.vercel.app`.

## 6. Ligar as pontas

1. **Render** → serviço `sync-api` → **Environment** → `CORS_ORIGINS`:
   ```
   ["https://sync-andressa.vercel.app","http://localhost:5173"]
   ```
   Salve (ele reinicia sozinho).
2. **Supabase → Authentication → URL Configuration**:
   - **Site URL**: `https://sync-andressa.vercel.app`
   - **Redirect URLs**: `https://sync-andressa.vercel.app` e `http://localhost:5173`

## 7. Testar

1. Abra o endereço da Vercel → **Entrar com Google** → escolha a conta.
2. O primeiro login cria o seu usuário (com as categorias padrão da lista de compras).
3. No celular, abra o mesmo endereço → menu do navegador → **Instalar app** / **Adicionar à tela de início**.

---

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| "Não foi possível conectar ao servidor" na primeira vez | O Render estava dormindo: espere ~1 min e recarregue |
| Erro de **CORS** no console (F12) | `CORS_ORIGINS` no Render sem o endereço exato da Vercel (com `https://`, sem barra no fim) |
| "Sua sessão expirou" logo depois de entrar | `SUPABASE_URL` diferente no Render e na Vercel, ou o projeto ainda usa o "Legacy JWT secret" (passo 2.4) |
| Google diz "access blocked" | E-mail não está em **Test users** (passo 3.2) |
| Render falha ao iniciar com "SUPABASE_URL is required" | É a trava de segurança: falta a variável |
| Render falha nas migrações | `DATABASE_URL` errada (senha, ou não é o Session pooler) |

**Backup**: o Supabase gratuito não faz backup automático. Uma vez por mês: **Database → Backups**, ou `pg_dump` com a mesma URI.
