# AI Chat Hub

AI Chat Hub è una piattaforma multi-tenant con RAG, widget embeddabile e dashboard admin.

Stack:
- Next.js App Router + TypeScript
- Prisma + PostgreSQL
- `pgvector` per embeddings/similarity
- Row Level Security (RLS) con tenant context per request

## Architettura sicurezza

1. Middleware valida `clientId` su endpoint tenant-scoped:
- header `x-client-id` (priorità)
- fallback query param `clientId`
- se manca `clientId`: `400`
- se UUID non valido: `400`
- se tenant non esiste: `404`

2. RLS su tabelle tenant-scoped:
- `documents`
- `chunks`
- `conversations`
- `leads`
- `feedback`

3. Tenant context obbligatorio in DB:
- tutte le query tenant-scoped passano da `withTenant(clientId, fn)`
- `withTenant` apre `prisma.$transaction`, esegue:
  - `SELECT set_config('app.tenant_id', <clientId>, true)`
- poi esegue le query nel callback usando `tx`

4. RAG retrieval con filtro ridondante:
- oltre a RLS, la similarity query applica anche `WHERE client_id = <clientId>`

## Nota importante su pooling Prisma

Prisma usa connection pooling. Per evitare leakage di tenant context:
- non usare il client Prisma globale per query tenant-scoped
- usare solo `tx` ricevuto dentro `withTenant`
- query raw `pgvector` devono stare nella stessa transazione `withTenant`

## Modello dati

Tabelle principali:
- `clients` (admin/global)
- `documents` (tenant-scoped)
- `chunks` (tenant-scoped, con `embedding vector(1536)`)
- `conversations` (tenant-scoped)
- `leads` (tenant-scoped)
- `feedback` (tenant-scoped)

## Setup locale

Prerequisiti:
- Node.js 20+
- PostgreSQL 15+
- estensione `pgvector`

1. Installa dipendenze:

```bash
npm install
```

2. Crea env:

```bash
cp .env.example .env
```

3. Crea DB e ruoli base (esempio):

```sql
CREATE DATABASE ai_chat_hub;
\c ai_chat_hub

-- utente applicativo
CREATE ROLE app_user LOGIN PASSWORD 'change_me';
-- utente admin opzionale
CREATE ROLE admin_user LOGIN PASSWORD 'change_me_admin';
```

4. Applica migrazioni:

```bash
npm run prisma:migrate
```

oppure in produzione:

```bash
npm run prisma:deploy
```

5. Genera client Prisma:

```bash
npm run prisma:generate
```

6. Avvia progetto:

```bash
npm run dev
```

## Setup RLS (dettaglio)

La migrazione `prisma/migrations/0002_rls/migration.sql`:
- abilita + forza RLS sulle tabelle tenant-scoped
- crea policy `FOR ALL` con vincolo:

```sql
client_id = current_setting('app.tenant_id', true)::uuid
```

- crea/gestisce ruoli `app_user` e `admin_user`
- applica GRANT minimi necessari

### Scelta su tabella `clients`

`clients` è gestita come tabella admin/global (non soggetta alla stessa policy tenant RLS), così il middleware può validare l'esistenza tenant prima di impostare tenant context.

## API

### Pubbliche/tenant-scoped
- `GET /api/health`
- `POST /api/chat`
- `POST /api/lead`
- `POST /api/feedback`
- `POST /api/ingest` (multipart, campo `file`, supporta `.md`/`.txt`)

### Admin globali (header `x-admin-secret`)
- `GET/POST/PUT/DELETE /api/admin/clients`
- `GET /api/admin/metrics?clientId=<uuid>`

### Endpoint interno middleware
- `GET /api/internal/client-exists?clientId=<uuid>` (protetto con `x-admin-secret`)

## Widget embeddabile

Componente React:
- `components/ChatWidget.tsx`

Uso:

```tsx
<ChatWidget clientId="<tenant-uuid>" apiBaseUrl="https://your-app.vercel.app" />
```

Pagina demo:
- `/demo?clientId=<tenant-uuid>`

## Deploy su Vercel

Env vars richieste:
- `DATABASE_URL` (utente `app_user`)
- `DATABASE_URL_ADMIN` (opzionale, per operazioni elevate)
- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL`
- `OPENAI_EMBEDDING_MODEL`
- `ADMIN_SECRET`
- `APP_BASE_URL`

Checklist post-deploy:
1. `GET /api/health` restituisce `ok: true`
2. Crea tenant da `/admin`
3. Ingest documento con `POST /api/ingest` + `x-client-id`
4. Chat da `/demo?clientId=...`
5. Verifica metriche da endpoint admin

## Comandi utili

```bash
npm run dev
npm run lint
npm run build
npm run format
npm run format:check
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
```
