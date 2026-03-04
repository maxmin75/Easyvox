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
- `file_assets`

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
- `app_settings` (admin/global)
- `file_assets` (tenant-scoped, metadata file su Vercel Blob)
- `documents` (tenant-scoped)
- `chunks` (tenant-scoped, con `embedding vector(1536)`)
- `conversations` (tenant-scoped)
- `leads` (tenant-scoped)
- `feedback` (tenant-scoped)

## Catalogo elementi (cosa serve, cosa fa, dati, creazione)

### Tabelle DB

`clients`
- Serve per: registro tenant (anagrafica cliente).
- Fa: contiene `id` (UUID tenant), `name`, `slug`, `system_prompt`.
- Dati da dove arrivano: da API admin (`POST /api/admin/clients`) o inserimento SQL manuale.
- Da creare?: Sì, almeno 1 record client per usare chat/ingest tenant.

`app_settings`
- Serve per: configurazione runtime globale API/modelli.
- Fa: salva provider AI (`openai`/`ollama`), OpenAI key (opzionale), modelli OpenAI/Ollama, `APP_BASE_URL`.
- Dati da dove arrivano: dashboard admin (`/admin`) tramite `GET/PUT /api/admin/settings`.
- Da creare?: No manualmente; viene creato/aggiornato automaticamente.

`documents`
- Serve per: tracciare i documenti caricati per tenant.
- Fa: salva metadati file (`title`, `source`) per ogni upload ingest.
- Dati da dove arrivano: da `POST /api/ingest`.
- Da creare?: No manualmente, viene creato automaticamente durante ingest.

`chunks`
- Serve per: base conoscenza RAG interrogabile.
- Fa: salva porzioni di testo e `embedding vector(1536)` per similarity search.
- Dati da dove arrivano: da `POST /api/ingest` (chunking + embedding OpenAI).
- Da creare?: No manualmente; si popola con ingest documenti.

`conversations`
- Serve per: storico chat tenant.
- Fa: salva `session_id`, messaggio utente, risposta assistant.
- Dati da dove arrivano: da `POST /api/chat`.
- Da creare?: No manualmente; si popola con le chat.

`leads`
- Serve per: raccolta contatti commerciali.
- Fa: salva nome, email, messaggio opzionale.
- Dati da dove arrivano: da `POST /api/lead`.
- Da creare?: No manualmente; si popola da widget/form.

`feedback`
- Serve per: raccolta feedback qualità conversazioni.
- Fa: salva rating/commento/sessione opzionale.
- Dati da dove arrivano: da `POST /api/feedback`.
- Da creare?: No manualmente; si popola da frontend.

`file_assets`
- Serve per: catalogo file tenant caricati su storage.
- Fa: salva metadata (`filename`, `mime_type`, `size_bytes`, `blob_url`, `blob_path`).
- Dati da dove arrivano: da `POST /api/files`.
- Da creare?: No manualmente; si popola con upload file.

### API endpoint

`GET /api/health`
- Serve per: health check applicazione.
- Fa: ritorna stato servizio e timestamp.
- Dati da dove arrivano: runtime app.
- Da creare?: No.

`POST /api/chat` (tenant-scoped)
- Serve per: chat AI con RAG per tenant.
- Fa: calcola embedding della query, recupera top chunks tenant, genera risposta e salva conversazione.
- Dati da dove arrivano: body (`sessionId`, `message`) + `x-client-id` + `chunks` già ingestiti + provider AI configurato.
- Da creare?: Sì, serve prima creare tenant e caricare documenti con ingest.

`POST /api/ingest` (tenant-scoped)
- Serve per: indicizzare documenti `.md/.txt`.
- Fa: crea `document`, chunka testo, genera embedding, inserisce `chunks`.
- Dati da dove arrivano: multipart `file` oppure `fileAssetId` (file già su Blob) + `x-client-id` + provider embedding configurato.
- Da creare?: Sì, va invocato almeno una volta per avere contenuto RAG.

`GET/POST /api/files` (tenant-scoped)
- Serve per: upload e lista file tenant su Vercel Blob.
- Fa: carica file in Blob `private`, salva metadata in `file_assets`, lista file del tenant.
- Dati da dove arrivano: multipart `file` + `x-client-id`.
- Da creare?: No endpoint; va solo usato dal client/app.

`GET/DELETE /api/files/:id` (tenant-scoped)
- Serve per: download o rimozione file tenant.
- Fa: scarica contenuto file da Blob privato o elimina file+metadata.
- Dati da dove arrivano: id file in `file_assets` + `x-client-id`.
- Da creare?: No.

`POST /api/lead` (tenant-scoped)
- Serve per: acquisire lead.
- Fa: crea un record in `leads`.
- Dati da dove arrivano: body (`name`, `email`, `message`) + `x-client-id`.
- Da creare?: No, solo consumare endpoint.

`POST /api/feedback` (tenant-scoped)
- Serve per: raccogliere feedback utente.
- Fa: crea un record in `feedback`.
- Dati da dove arrivano: body (`sessionId?`, `rating?`, `comment?`) + `x-client-id`.
- Da creare?: No, solo consumare endpoint.

`GET/POST/PUT/DELETE /api/admin/clients` (admin)
- Serve per: gestione tenant globale.
- Fa: lista, crea, aggiorna, elimina client.
- Dati da dove arrivano: header `x-admin-secret` + payload admin.
- Da creare?: Sì, è il modo standard per creare tenant.

`GET /api/admin/metrics?clientId=<uuid>` (admin)
- Serve per: metriche aggregate.
- Fa: conta conversazioni/leads/feedback/documents/chunks.
- Dati da dove arrivano: tabelle DB.
- Da creare?: No.

`GET/PUT /api/admin/settings` (admin)
- Serve per: gestione configurazioni API globali.
- Fa: legge/salva provider AI, OpenAI key, config Ollama, modelli AI e `APP_BASE_URL`.
- Dati da dove arrivano: header `x-admin-secret` + payload impostazioni.
- Da creare?: No endpoint; va solo configurato da `/admin`.

### Frontend

`/admin`
- Serve per: backoffice rapido tenant.
- Fa: inserimento `ADMIN_SECRET`, gestione impostazioni API runtime, creazione/lista client.
- Dati da dove arrivano: API admin.
- Da creare?: No, pagina pronta.

`/demo?clientId=<uuid>`
- Serve per: test widget con tenant specifico.
- Fa: renderizza `ChatWidget` e invia chiamate `/api/chat`.
- Dati da dove arrivano: query param `clientId`.
- Da creare?: No, ma devi passare un `clientId` reale creato prima.

`components/ChatWidget.tsx`
- Serve per: embedding chat su siti esterni.
- Fa: invia `x-client-id`, `sessionId`, `message` a `/api/chat`.
- Dati da dove arrivano: props (`clientId`, `apiBaseUrl`, `sessionId?`) + input utente.
- Da creare?: No, componente già pronto; va solo integrato.

## Elementi backend (mappa chiara)

`middleware.ts`
- Serve per: guardia centralizzata su API tenant-scoped.
- Fa: valida `clientId`, controlla formato UUID, verifica esistenza tenant, normalizza header `x-client-id`.
- Input: request verso `/api/chat`, `/api/lead`, `/api/feedback`, `/api/ingest`.
- Output: passa la request o blocca con `400/404`.
- Da creare/configurare?: No, già implementato.

`lib/db/tenant.ts` (`withTenant`)
- Serve per: isolamento tenant affidabile con Prisma pooling.
- Fa: apre transazione, imposta `set_config('app.tenant_id', clientId, true)`, esegue query con `tx`.
- Input: `clientId` valido + callback query.
- Output: risultato callback in perimetro tenant-safe.
- Da creare/configurare?: No, ma tutte le query tenant devono passare da qui.

`lib/rag/retrieval.ts`
- Serve per: similarity search pgvector.
- Fa: query raw su `chunks` con ordinamento vettoriale e filtro ridondante `client_id = ...`.
- Input: `tx`, `clientId`, embedding query, `topK`.
- Output: top chunks con score.
- Da creare/configurare?: No; richiede che ingest abbia popolato `chunks`.

`lib/rag/chunking.ts`
- Serve per: suddivisione testo in chunk.
- Fa: chunking con overlap per migliorare retrieval.
- Input: testo documento.
- Output: array chunk.
- Da creare/configurare?: No.

`lib/rag/embeddings.ts`
- Serve per: serializzazione embedding per pgvector.
- Fa: converte array numerico nel literal SQL `vector`.
- Input: `number[]` embedding.
- Output: string literal pgvector.
- Da creare/configurare?: No.

`lib/runtime-settings.ts`
- Serve per: risoluzione impostazioni runtime globali.
- Fa: legge `app_settings` e applica priorita alle ENV (`ENV > DB > default`) anche per provider Ollama/OpenAI.
- Input: variabili ambiente + tabella `app_settings`.
- Output: config runtime usata da chat/ingest.
- Da creare/configurare?: No file; configurare valori in ENV o `/admin`.

`lib/ai/provider.ts`
- Serve per: astrazione provider AI.
- Fa: instrada chat/embeddings su OpenAI o Ollama con stessa interfaccia.
- Input: testo/prompt + runtime settings.
- Output: risposta chat + usage estimate, embeddings.
- Da creare/configurare?: Configurare `AI_PROVIDER`/setting e endpoint del provider.

`app/api/chat/route.ts`
- Serve per: endpoint chat con RAG tenant.
- Fa: valida payload, recupera contesto chunks, genera risposta AI, salva conversazione.
- Input: `x-client-id`, `{ sessionId, message }`.
- Output: `{ reply, usageEstimate, sources }`.
- Da creare/configurare?: Serve almeno 1 tenant + documenti ingestiti.

`app/api/ingest/route.ts`
- Serve per: ingestion knowledge base.
- Fa: accetta `.md/.txt` diretto o `fileAssetId`, crea `documents`, chunka, embeddizza, inserisce `chunks`.
- Input: `x-client-id`, multipart `file` oppure `fileAssetId`.
- Output: `{ documentId, chunkCount }`.
- Da creare/configurare?: Sì, va usato per popolare RAG. PDF/immagini richiedono parser/OCR prima di ingest.

`app/api/files/route.ts`
- Serve per: storage file tenant.
- Fa: upload/lista file tenant su Vercel Blob privato.
- Input: `x-client-id`, multipart `file` (POST).
- Output: metadata file salvato su DB + Blob.
- Da creare/configurare?: Serve `BLOB_READ_WRITE_TOKEN` in ENV.

`app/api/files/[id]/route.ts`
- Serve per: lifecycle file per tenant.
- Fa: download file Blob privato o delete file+metadata.
- Input: `x-client-id` + `id` file.
- Output: stream file o conferma cancellazione.
- Da creare/configurare?: Serve `BLOB_READ_WRITE_TOKEN` in ENV.

`app/api/lead/route.ts`
- Serve per: raccolta lead.
- Fa: inserisce record su `leads` in contesto tenant.
- Input: `x-client-id`, `{ name, email, message? }`.
- Output: id e timestamp lead.
- Da creare/configurare?: No.

`app/api/feedback/route.ts`
- Serve per: raccolta feedback chat.
- Fa: inserisce record su `feedback`.
- Input: `x-client-id`, `{ sessionId?, rating?, comment? }`.
- Output: id e timestamp feedback.
- Da creare/configurare?: No.

`app/api/admin/clients/route.ts`
- Serve per: CRUD tenant globale.
- Fa: crea/lista/modifica/cancella clienti.
- Input: header `x-admin-secret` + payload admin.
- Output: record clients.
- Da creare/configurare?: Sì `ADMIN_SECRET`; usalo per creare tenant iniziali.

`app/api/admin/metrics/route.ts`
- Serve per: metriche operative.
- Fa: conteggi aggregati per tenant o globali.
- Input: `x-admin-secret`, query `clientId?`.
- Output: totals conversazioni/leads/feedback/documents/chunks.
- Da creare/configurare?: No.

`app/api/admin/settings/route.ts`
- Serve per: endpoint impostazioni globali API.
- Fa: salva/recupera chiavi e modelli runtime in `app_settings`.
- Input: `x-admin-secret`, payload impostazioni.
- Output: stato impostazioni + indicatori override ENV.
- Da creare/configurare?: No endpoint; da usare dalla dashboard admin.

`app/api/internal/client-exists/route.ts`
- Serve per: supporto middleware.
- Fa: verifica esistenza tenant prima del routing tenant-scoped.
- Input: `x-admin-secret`, `clientId`.
- Output: `{ exists: true|false }`.
- Da creare/configurare?: No.

## Elementi frontend (mappa chiara)

`app/page.tsx`
- Serve per: landing tecnica del progetto.
- Fa: spiega stack/sicurezza e link a demo/admin.
- Input: nessuno.
- Output: UI informativa.
- Da creare/configurare?: No.

`app/demo/page.tsx`
- Serve per: test funzionale widget.
- Fa: legge `clientId` da query string e monta `ChatWidget`.
- Input: `?clientId=<uuid>`.
- Output: chat demo pronta.
- Da creare/configurare?: Devi avere un `clientId` esistente.

`components/ChatWidget.tsx`
- Serve per: componente riusabile embeddabile.
- Fa: gestisce stato chat lato client e chiamate `/api/chat`.
- Input: props `clientId`, `apiBaseUrl?`, `sessionId?` + testo utente.
- Output: messaggi UI utente/assistant.
- Da creare/configurare?: No, solo integrare nel tuo frontend host.

`app/admin/page.tsx`
- Serve per: pannello operativo minimo admin.
- Fa: consente login con `ADMIN_SECRET`, gestione impostazioni API, creazione tenant e lista clienti.
- Input: secret e campi form client.
- Output: operazioni CRUD client via API admin.
- Da creare/configurare?: No, ma devi conoscere `ADMIN_SECRET`.

`app/layout.tsx` + `app/globals.css`
- Serve per: shell visuale e stile globale.
- Fa: font, palette, layout base, component primitives.
- Input: nessuno.
- Output: coerenza UI globale.
- Da creare/configurare?: No.

### Variabili ambiente

`DATABASE_URL`
- Serve per: connessione DB applicativa (utente `app_user`).
- Fa: tutte le query runtime app.
- Dati da dove arrivano: provisioning Postgres.
- Da creare?: Sì, obbligatoria.

`BLOB_READ_WRITE_TOKEN`
- Serve per: accesso server-side a Vercel Blob (upload/download/delete).
- Fa: abilita endpoint `/api/files` e ingest via `fileAssetId`.
- Dati da dove arrivano: Vercel Storage -> Blob.
- Da creare?: Sì, obbligatoria se usi file storage.

`DATABASE_URL_ADMIN`
- Serve per: connessione elevata opzionale (admin/migrazioni avanzate).
- Fa: supporta operazioni extra fuori perimetro tenant.
- Dati da dove arrivano: provisioning Postgres.
- Da creare?: Facoltativa (consigliata).

`OPENAI_API_KEY`
- Serve per: embeddings e risposta AI.
- Fa: abilita `POST /api/chat` e `POST /api/ingest` quando provider=`openai`.
- Dati da dove arrivano: account OpenAI.
- Da creare?: Solo se usi OpenAI.

`OPENAI_CHAT_MODEL`
- Serve per: modello chat.
- Fa: definisce il modello usato in `/api/chat` quando provider=`openai`.
- Dati da dove arrivano: configurazione app.
- Da creare?: No, ha default (`gpt-4o-mini`), ma consigliato impostarlo.

`OPENAI_EMBEDDING_MODEL`
- Serve per: modello embeddings.
- Fa: definisce il modello usato in `/api/ingest` e retrieval quando provider=`openai`.
- Dati da dove arrivano: configurazione app.
- Da creare?: No, ha default (`text-embedding-3-small`), ma consigliato impostarlo.

`AI_PROVIDER`
- Serve per: selezione provider AI globale.
- Fa: forza provider runtime (`ollama` o `openai`).
- Dati da dove arrivano: ENV o `/admin` settings.
- Da creare?: No, ma consigliato impostarlo esplicitamente.

`OLLAMA_BASE_URL`
- Serve per: endpoint HTTP del server Ollama.
- Fa: abilita chat/embedding quando provider=`ollama`.
- Dati da dove arrivano: URL del server Ollama (es. `http://localhost:11434`).
- Da creare?: Sì se usi Ollama.

`OLLAMA_CHAT_MODEL`
- Serve per: modello chat Ollama.
- Fa: definisce modello chat (`qwen2.5:7b` default).
- Dati da dove arrivano: configurazione Ollama.
- Da creare?: No, ma consigliato.

`OLLAMA_EMBEDDING_MODEL`
- Serve per: modello embeddings Ollama.
- Fa: definisce modello embeddings (`nomic-embed-text` default).
- Dati da dove arrivano: configurazione Ollama.
- Da creare?: No, ma devi fare `ollama pull nomic-embed-text` se usi Ollama embeddings.

`ADMIN_SECRET`
- Serve per: protezione endpoint admin globali.
- Fa: autorizza chiamate `/api/admin/*` e endpoint interno middleware.
- Dati da dove arrivano: segreto generato da te.
- Da creare?: Sì, obbligatoria.

`APP_BASE_URL`
- Serve per: URL base applicazione (utile per demo/widget/deploy).
- Fa: riferimento host pubblico.
- Dati da dove arrivano: URL Vercel o dominio custom.
- Da creare?: Sì in produzione.

## Setup locale

Prerequisiti:
- Node.js 20+
- PostgreSQL 15+
- estensione `pgvector`
- Vercel Blob (storage file)

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

## Setup Neon + Vercel Blob (consigliato)

1. Crea database su Neon (PostgreSQL).
2. Imposta `DATABASE_URL` con credenziali utente applicativo (`app_user`).
3. Applica migrazioni:
```bash
npm run prisma:deploy
```
4. In Vercel, aggiungi Blob al progetto e copia `BLOB_READ_WRITE_TOKEN`.
5. Imposta env su Vercel:
- `DATABASE_URL`
- `BLOB_READ_WRITE_TOKEN`
- `OPENAI_API_KEY` (oppure config da `/admin`)
- `ADMIN_SECRET`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
- `AUTH_TWITTER_ID` / `AUTH_TWITTER_SECRET`
- `AUTH_FACEBOOK_ID` / `AUTH_FACEBOOK_SECRET`
6. Redeploy.

## Login Social con Auth.js (NextAuth)

Questa app supporta anche login social self-hosted con Auth.js su:
- Google
- X.com (provider `twitter`)
- Facebook

Variabili richieste:
- `AUTH_SECRET` (oppure `NEXTAUTH_SECRET`)
- `NEXTAUTH_URL` (es. `http://localhost:3000`)
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- `AUTH_TWITTER_ID`, `AUTH_TWITTER_SECRET`
- `AUTH_FACEBOOK_ID`, `AUTH_FACEBOOK_SECRET`

Callback URL da impostare nei provider OAuth:
- `http://localhost:3000/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/twitter`
- `http://localhost:3000/api/auth/callback/facebook`

In produzione sostituisci `http://localhost:3000` con il tuo dominio pubblico.

## Setup Ollama (gratis)

1. Avvia Ollama:
```bash
ollama serve
```
2. Scarica modelli:
```bash
ollama pull qwen2.5:7b
ollama pull nomic-embed-text
```
3. Imposta provider:
- `AI_PROVIDER=ollama`
- `OLLAMA_BASE_URL=http://localhost:11434` (o URL pubblico del tuo server Ollama)

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
- `GET/POST /api/files`
- `GET/DELETE /api/files/:id`

### Admin globali (header `x-admin-secret`)
- `GET/POST/PUT/DELETE /api/admin/clients`
- `GET /api/admin/metrics?clientId=<uuid>`
- `GET/PUT /api/admin/settings`

### Endpoint interno middleware
- `GET /api/internal/client-exists?clientId=<uuid>` oppure `?clientSlug=<slug>` (protetto con `x-admin-secret`)

## Widget embeddabile

Componente React:
- `components/ChatWidget.tsx`

Uso:

```tsx
<ChatWidget clientId="<tenant-uuid>" apiBaseUrl="https://your-app.vercel.app" />
<ChatWidget username="<tenant-slug>" apiBaseUrl="https://your-app.vercel.app" />
```

UI widget:
- label tenant mostrata come `Ditta`
- messaggio utente etichettato come `tu`
- nome `assistant` configurabile da backend (`clients.assistant_name`, fallback `Assistant`)

Pagina demo:
- `/demo?clientId=<tenant-uuid>`
- `/demo?username=<tenant-slug>`
- `/demo?ditta=<tenant-slug>`

## Deploy su Vercel

Env vars richieste:
- `DATABASE_URL` (utente `app_user`)
- `BLOB_READ_WRITE_TOKEN` (Vercel Blob private access)
- `DATABASE_URL_ADMIN` (opzionale, per operazioni elevate)
- `AI_PROVIDER` (`ollama` o `openai`)
- `OLLAMA_BASE_URL` (se provider `ollama`)
- `OLLAMA_CHAT_MODEL` (opzionale, default `qwen2.5:7b`)
- `OLLAMA_EMBEDDING_MODEL` (opzionale, default `nomic-embed-text`)
- `OPENAI_API_KEY` (se provider `openai`; opzionale se da `/admin`)
- `OPENAI_CHAT_MODEL` (opzionale, da `/admin` o default)
- `OPENAI_EMBEDDING_MODEL` (opzionale, da `/admin` o default)
- `ADMIN_SECRET`
- `APP_BASE_URL` (opzionale se impostata da `/admin`)

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
