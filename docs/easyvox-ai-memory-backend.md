# EasyVox AI Memory Backend

Backend production-oriented per EasyVox con memoria applicativa persistente, multi-tenant e database-first.

## Architettura

- `app/api/chat-v2/route.ts`: handler HTTP sottile, valida input, risolve tenant/accesso e delega al service.
- `lib/ai-memory/chat-service.ts`: orchestratore del ciclo chat.
- `lib/ai-memory/context-builder.ts`: costruisce il contesto dinamico pre-GPT da database applicativo.
- `lib/ai-memory/memory-updater.ts`: aggiorna profilo, memorie persistenti ed eventi CRM dopo ogni risposta.
- `lib/ai-memory/summary-service.ts`: genera e persiste summary periodici per sessione.
- `lib/ai-memory/crm-event-tracker.ts`: traccia eventi CRM tenant-scoped.
- `lib/ai-memory/customer-service.ts`: risolve e crea il customer persistente.
- `Document` + `Chunk`: knowledge base vettoriale già presente, usata come sorgente RAG.

Flusso:

1. L’API riceve `sessionId`, `message`, dati cliente opzionali e il tenant via header.
2. Il sistema risolve il tenant, l’utente autenticato e il `ChatCustomer`.
3. Viene creato l’embedding del messaggio e recuperato il knowledge context.
4. `context-builder` unisce memoria breve, lunga, profilo cliente, summary e knowledge base.
5. GPT risponde usando il contesto costruito dal database, non da memoria interna del modello.
6. Il turno viene salvato in `conversations`.
7. `memory-updater` estrae fatti persistenti, aggiorna `customer_profiles` e `memory_entries`.
8. `summary-service` aggiorna `conversation_summaries` a intervalli regolari.
9. Ogni step rilevante scrive un `crm_event`.

## Schema database

Nuove tabelle:

- `customer_profiles`: profilo persistente cliente.
- `memory_entries`: memoria breve/lunga/profile per customer.
- `conversation_summaries`: summary automatici per sessione.
- `crm_events`: timeline CRM strutturata.

Tutte sono isolate per tenant tramite `client_id`, transazioni `withTenant(...)` e foreign keys.

## Struttura cartelle

```text
app/api/chat-v2/route.ts
lib/ai-memory/
  chat-service.ts
  context-builder.ts
  customer-service.ts
  crm-event-tracker.ts
  memory-updater.ts
  openai-json.ts
  summary-service.ts
  constants.ts
  types.ts
  utils.ts
docs/easyvox-ai-memory-backend.md
prisma/schema.prisma
prisma/migrations/20260312101812_ai_memory_backend/migration.sql
```

## Principi progettuali

- Multi-tenant first: ogni query applicativa è tenant-scoped.
- Database as memory system: GPT usa il database come fonte di memoria primaria.
- Modulare: route sottile, orchestration separata, servizi verticali.
- Estendibile: si possono aggiungere ranking semantico memoria, job async e audit trail senza rifattorizzare la route.
- Production-oriented: tipi forti, persistenza esplicita, fallback euristici se OpenAI extraction non è disponibile.

## API chat

Endpoint: `POST /api/chat-v2`

Headers:

- `x-client-id` oppure `x-client-slug`

Payload:

```json
{
  "sessionId": "web-session-001",
  "message": "Vorrei una demo per il mio studio dentistico",
  "customerName": "Mario Rossi",
  "customerEmail": "mario@studio.it"
}
```

Response:

```json
{
  "reply": "…",
  "assistantName": "EasyVox AI",
  "usageEstimate": {
    "inputTokens": 123,
    "outputTokens": 87
  },
  "provider": "openai",
  "customerId": "uuid",
  "sources": [
    {
      "id": "uuid",
      "score": 0.91
    }
  ],
  "summaryUpdated": true
}
```
