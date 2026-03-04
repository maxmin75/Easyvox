# AI UI Actions MVP (isolato)

Questa implementazione e' isolata e non modifica flussi esistenti.

## Cosa include

- Endpoint API: `/api/ai-ui-chat`
- Pagina demo chat: `/ai-ui-chat`
- Contratto AI con validazione Zod e whitelist actions
- Renderer frontend che mostra componenti UI in base alle actions
- Mock LLM (`/lib/llmClient.ts`) + system prompt (`/lib/systemPrompt.ts`)
- Mock products (`/lib/mockProducts.ts`) + provider (`/lib/providers/productProvider.ts`)
- Rate limit in-memory per endpoint chat

## Actions supportate (MVP)

- `SHOW_PRODUCTS` payload `{ query?: string, category?: string }`
- `OPEN_PRODUCT` payload `{ productId: string }`
- `OPEN_BOOKING_MODAL` payload `{ date?: string, time?: string, service?: string }`
- `OPEN_SUPPORT_FORM` payload `{ topic?: string }`
- `OPEN_CHECKOUT` payload `{ cartId?: string }`
- `NONE`

## Sicurezza

- Nessun HTML renderizzato da output AI.
- Solo action in whitelist + payload validati con Zod.
- Action invalide scartate con `console.warn`, senza crash.
- Rate limit base in-memory su `/api/ai-ui-chat`.

## Avvio

1. Installa dipendenze:

```bash
npm install
```

2. Avvia in dev:

```bash
npm run dev
```

3. Apri la demo:

- [http://localhost:3000/ai-ui-chat](http://localhost:3000/ai-ui-chat)

## File principali

- `app/api/ai-ui-chat/route.ts`
- `app/ai-ui-chat/page.tsx`
- `lib/ai-ui-actions/contracts.ts`
- `lib/ai-ui-actions/rateLimit.ts`
- `lib/llmClient.ts`
- `lib/systemPrompt.ts`
- `lib/mockProducts.ts`
- `lib/providers/productProvider.ts`
- `components/ai-ui-actions/ActionRenderer.tsx`
- `components/ai-ui-actions/ProductGrid.tsx`
- `components/ai-ui-actions/ProductModal.tsx`
- `components/ai-ui-actions/BookingModal.tsx`
- `components/ai-ui-actions/SupportForm.tsx`
- `components/ai-ui-actions/CheckoutDrawer.tsx`
