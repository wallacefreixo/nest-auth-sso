# Backend NestJS – Autenticação Segura com OIDC, PKCE, Redis e Cookies HTTP-only

## 🛠 Tecnologias utilizadas

- NestJS – framework Node.js modular e escalável
- TypeScript – tipagem estática
- PostgreSQL – banco de dados relacional
- Redis – armazenamento de sessões e cache
- TypeORM – ORM para PostgreSQL
- Axios – comunicação com Identity Provider (OIDC)
- express-session – gerenciamento de sessões
- connect-redis – persistência de sessões no Redis
- helmet – proteção de headers HTTP
- csurf – proteção contra CSRF
- @nestjs/throttler – proteção contra brute force / flood
- cors – configuração de Cross-Origin
- Keycloak – Identity Provider (OIDC)

---

# 🔐 Arquitetura de autenticação

A autenticação segue o padrão:

```text
Frontend → NestJS Backend → Keycloak (OIDC)
```

O frontend nunca acessa tokens diretamente.

O backend é responsável por:

- iniciar o fluxo OIDC
- validar autenticação
- trocar authorization code por tokens
- armazenar sessão
- renovar tokens silenciosamente
- proteger contra CSRF e replay attacks

---

# 🔐 Principais implementações de segurança

## OIDC Authorization Code Flow

Fluxo moderno recomendado para aplicações web.

O backend utiliza:

- `authorization_code`
- `state`
- `PKCE`
- cookies HTTP-only
- sessões server-side

---

# 🔐 PKCE (Proof Key for Code Exchange)

Implementado para proteger o fluxo OAuth/OIDC contra interceptação do `authorization_code`.

## Funcionamento

### 1. Backend gera:

- `code_verifier`
- `code_challenge`

---

### 2. `code_challenge` é enviado ao Keycloak

```text
GET /auth
  code_challenge=abc123
```

---

### 3. Após login

Keycloak retorna:

```text
/callback?code=xyz
```

---

### 4. Backend envia

- `authorization_code`
- `code_verifier`

para o endpoint `/token`.

---

### 5. Keycloak valida

```text
SHA256(code_verifier) === code_challenge
```

---

## Benefícios

- impede reutilização do authorization code
- protege contra replay/interceptação
- segue OAuth 2.1 Best Practices
- reduz risco de token theft

---

# 🔐 State Parameter (Proteção CSRF OIDC)

Implementação de proteção CSRF específica do fluxo OAuth/OIDC.

## Funcionamento

- Backend gera `state` aleatório usando `crypto.randomBytes`
- `state` é armazenado na sessão
- Keycloak retorna o mesmo `state` no callback
- Backend valida o valor antes da autenticação

## Protege contra

- login CSRF
- OAuth callback injection
- autenticação forjada
- replay de callback

---

# 🔄 Refresh Silencioso (Silent Refresh)

O backend renova tokens automaticamente sem interação do usuário.

## Funcionamento

1. Access token expira
2. Backend utiliza refresh token armazenado na sessão
3. Novo access token é obtido automaticamente
4. Sessão é atualizada de forma transparente

---

## Benefícios

- melhora UX
- evita logout frequente
- mantém sessão segura server-side
- reduz necessidade de novo login

---

# 🗄 Redis Session Storage

Sessões e tokens são armazenados no Redis.

## Benefícios

- compartilhamento de sessões entre múltiplas instâncias
- escalabilidade horizontal
- revogação centralizada
- invalidação rápida de sessões
- melhor performance de leitura/escrita

---

## Utilizações

- sessões OIDC
- refresh tokens
- PKCE verifier temporário
- state temporário
- cache de autenticação
- controle de sessões ativas

---

# 🍪 Cookies HTTP-only

Sessões utilizam cookies:

- `httpOnly`
- `secure`
- `sameSite`
- não acessíveis via JavaScript

## Benefícios

- reduz risco de XSS roubar tokens
- protege credenciais no browser
- impede acesso direto do frontend aos tokens

---

# 🛡 CSRF Protection

Implementação via `csurf`.

## Funcionamento

- Backend gera token CSRF
- Frontend envia token no header `X-XSRF-TOKEN`
- Backend valida token em requisições mutáveis

---

## Endpoint

```http
GET /auth/csrf
```

---

## Retorno

```json
{
  "csrfToken": "abc123"
}
```

---

## Frontend

O frontend deve enviar:

```http
X-XSRF-TOKEN: abc123
```

em requisições:

- POST
- PUT
- PATCH
- DELETE

---

# 🚦 Rate Limiting (@nestjs/throttler)

Proteção contra:

- brute force
- flood
- abuso de endpoints OIDC
- spam de autenticação

---

## Aplicado principalmente em:

- `/auth/login`
- `/auth/callback`

---

# 🪖 Helmet

Configuração automática de headers de segurança:

- XSS Protection
- Clickjacking Protection
- MIME Sniffing Protection
- Content Security Policy

---

# 🌐 CORS configurado

- origin restrito ao frontend
- `credentials: true`
- suporte seguro a cookies HTTP-only

---

# ⚙️ Requisitos

- Node.js >= 20
- NPM >= 9
- PostgreSQL >= 15
- Redis >= 7
- Docker (opcional)

---

# 🔧 Instalação

```bash
git clone <repo-url>
cd auth-nest-sso
npm install
```

---

# 🌐 Variáveis de ambiente

Crie um `.env`:

```env
PORT=

SESSION_SECRET=
SESSION_COOKIE_NAME=

DATABASE_URL=
REDIS_URL=

KEYCLOAK_BASE_URL=
KEYCLOAK_REALM=
KEYCLOAK_CLIENT_ID=
KEYCLOAK_CLIENT_SECRET=
KEYCLOAK_REDIRECT_URI=

NODE_ENV=development

```

---

# 🗄 Configuração do PostgreSQL e Redis

## PostgreSQL

```bash
docker run --name nest-postgres-sso \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=pass \
  -e POSTGRES_DB=dbname \
  -p 5432:5432 \
  -d postgres:15
```

---

## Redis

```bash
docker run --name nest-redis-sso \
  -p 6379:6379 \
  -d redis:7
```

---

# 🚀 Executando o backend

## Desenvolvimento

```bash
npm run dev
```

---

## Produção

```bash
npm run build
npm run start
```

---

# 🔑 Endpoints principais

# 1️⃣ Login OIDC

```http
GET /auth/login
```

Redireciona para o Keycloak iniciando:

- state validation
- PKCE challenge
- Authorization Code Flow

---

# 2️⃣ Callback OIDC

```http
GET /auth/callback
```

Responsável por:

- validar state
- validar PKCE
- trocar code por tokens
- criar sessão autenticada

---

# 3️⃣ Sessão autenticada

```http
GET /auth/session
```

## Retorno

```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "user@email.com"
  }
}
```

---

# 4️⃣ Logout

```http
POST /auth/logout
```

Responsável por:

- destruir sessão
- invalidar autenticação local

---

# 5️⃣ Token CSRF

```http
GET /auth/csrf
```

## Retorno

```json
{
  "csrfToken": "abc123"
}
```

---

# 🔒 Rotas protegidas

Exemplo:

```ts
  @Get('session')
  @UseGuards(AuthGuard)
  getSession(@Req() req: Request) {
    return {
      authenticated: true,
      user: {
        id: req.session.user.id,
        email: req.session.user.email,
      },
    };
  }
```

Apenas usuários autenticados podem acessar.

---

# 📌 Fluxo resumido de autenticação

```text
1. Frontend chama /auth/login

2. Backend:
   - gera state
   - gera PKCE
   - salva sessão
   - redireciona Keycloak

3. Usuário autentica no Keycloak

4. Keycloak retorna authorization code

5. Backend:
   - valida state
   - valida PKCE
   - troca code por token
   - cria sessão Redis

6. Frontend utiliza cookies HTTP-only

7. Backend renova tokens silenciosamente
```
