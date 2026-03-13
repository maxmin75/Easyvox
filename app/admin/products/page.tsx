"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
  slug: string;
};

type ProductImage = {
  id: string;
  fileAssetId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
  url: string;
};

type Product = {
  id: string;
  clientId: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  longDescription: string;
  price: number;
  priceFormatted: string;
  discountPercent: number;
  discountedPrice: number;
  discountedPriceFormatted: string;
  productUrl: string;
  relatedProductIds: string[];
  structuredOutput: unknown;
  knowledgeDocumentId: string | null;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
};

type ProductMutationResponse = {
  product?: Product;
  warning?: string | null;
  error?: string;
};

type ImportResponse = {
  ok?: boolean;
  importedCount?: number;
  error?: string;
};

function emptyForm() {
  return {
    productId: "",
    title: "",
    shortDescription: "",
    description: "",
    price: "0",
    discountPercent: "0",
    productUrl: "",
    slug: "",
    relatedProductIds: "",
    externalImageUrls: "",
    imageAssetIds: [] as string[],
  };
}

async function readApiPayload<T>(response: Response): Promise<T | { error?: string }> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T | { error?: string };
  }

  const text = await response.text();
  return { error: text.trim() || "Risposta non valida dal server" };
}

export default function AdminProductsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState("");
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    fetch("/api/admin/clients")
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }: { ok: boolean; data: Client[] | { error?: string } }) => {
        if (!ok || !Array.isArray(data)) {
          setStatus((data as { error?: string }).error ?? "Errore caricamento agenti");
          return;
        }
        const nextClients = data;
        setClients(nextClients);
        if (nextClients[0]?.id) {
          setSelectedClientId(nextClients[0].id);
        } else {
          setStatus("Nessun agente disponibile.");
        }
      })
      .catch(() => setStatus("Errore caricamento agenti"));
  }, []);

  useEffect(() => {
    if (!selectedClientId) return;
    void loadProducts(selectedClientId);
  }, [selectedClientId]);

  async function loadProducts(agentId: string) {
    try {
      const response = await fetch(`/api/admin/products?agentId=${encodeURIComponent(agentId)}`);
      const data = await readApiPayload<Product[]>(response);
      if (!response.ok || !Array.isArray(data)) {
        setStatus((data as { error?: string }).error ?? "Errore caricamento prodotti");
        return;
      }
      setProducts(data);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Errore caricamento prodotti");
    }
  }

  function resetForm() {
    setForm(emptyForm());
  }

  function startEdit(product: Product) {
    setForm({
      productId: product.id,
      title: product.title,
      shortDescription: product.shortDescription,
      description: product.description,
      price: String(product.price),
      discountPercent: String(product.discountPercent),
      productUrl: product.productUrl,
      slug: product.slug,
      relatedProductIds: product.relatedProductIds.join(", "),
      externalImageUrls: product.images
        .filter((image) => !image.url.startsWith("/api/public/files/"))
        .map((image) => image.url)
        .join("\n"),
      imageAssetIds: product.images
        .map((image) => image.fileAssetId)
        .filter((value) => !value.startsWith("external-")),
    });
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!selectedClientId || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedIds: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/files", {
          method: "POST",
          headers: {
            "x-client-id": selectedClientId,
          },
          body: formData,
        });
        const data = (await readApiPayload<{ file?: { id: string } }>(response)) as {
          file?: { id: string };
          error?: string;
        };
        if (!response.ok || !data.file?.id) {
          setStatus(data.error ?? `Upload fallito per ${file.name}`);
          return;
        }
        uploadedIds.push(data.file.id);
      }

      setForm((current) => ({
        ...current,
        imageAssetIds: [...current.imageAssetIds, ...uploadedIds],
      }));
      setStatus(`${uploadedIds.length} immagini caricate`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload immagini fallito");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClientId) {
      setStatus("Seleziona un agente");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        agentId: selectedClientId,
        productId: form.productId || undefined,
        title: form.title,
        shortDescription: form.shortDescription,
        description: form.description,
        price: form.price,
        discountPercent: form.discountPercent,
        productUrl: form.productUrl,
        slug: form.slug || undefined,
        relatedProductIds: form.relatedProductIds
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        externalImageUrls: form.externalImageUrls
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
        imageAssetIds: form.imageAssetIds,
      };

      const response = await fetch("/api/admin/products", {
        method: form.productId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await readApiPayload<ProductMutationResponse>(response)) as ProductMutationResponse;
      if (!response.ok) {
        setStatus(data.error ?? "Salvataggio prodotto fallito");
        return;
      }

      setStatus(
        data.warning ??
          (form.productId ? "Prodotto aggiornato" : "Prodotto creato"),
      );
      resetForm();
      await loadProducts(selectedClientId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Salvataggio prodotto fallito");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!selectedClientId) return;
    if (!confirm(`Eliminare il prodotto "${product.title}"?`)) return;

    setDeletingProductId(product.id);
    try {
      const response = await fetch(
        `/api/admin/products?agentId=${encodeURIComponent(selectedClientId)}&productId=${encodeURIComponent(product.id)}`,
        { method: "DELETE" },
      );
      const data = (await readApiPayload<{ error?: string }>(response)) as { error?: string };
      if (!response.ok) {
        setStatus(data.error ?? "Eliminazione prodotto fallita");
        return;
      }

      if (form.productId === product.id) resetForm();
      setStatus("Prodotto eliminato");
      await loadProducts(selectedClientId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Eliminazione prodotto fallita");
    } finally {
      setDeletingProductId("");
    }
  }

  async function handleImportCatalog() {
    if (!selectedClientId) {
      setStatus("Seleziona un agente");
      return;
    }

    setImporting(true);
    try {
      const response = await fetch("/api/admin/products/import-easyvox", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId: selectedClientId }),
      });
      const data = (await readApiPayload<ImportResponse>(response)) as ImportResponse;
      if (!response.ok) {
        setStatus(data.error ?? "Import catalogo fallito");
        return;
      }

      setStatus(`Import completato: ${data.importedCount ?? 0} prodotti EasyVox`);
      await loadProducts(selectedClientId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import catalogo fallito");
    } finally {
      setImporting(false);
    }
  }

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const pendingImagePreviews = form.imageAssetIds.map((assetId) => ({
    id: assetId,
    url: selectedClientId ? `/api/public/files/${assetId}?clientId=${selectedClientId}` : "",
  }));
  const externalImagePreviews = form.externalImageUrls
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((url, index) => ({
      id: `external-${index}`,
      url,
    }));
  const imagePreviews = [...pendingImagePreviews, ...externalImagePreviews];
  const previewPrice = Number(form.price || 0);
  const previewDiscount = Number(form.discountPercent || 0);
  const previewDiscountedPrice = Number((previewPrice * (1 - previewDiscount / 100)).toFixed(2));
  const previewRelatedIds = form.relatedProductIds
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return (
    <main className="container" style={{ padding: "28px 0 56px", display: "grid", gap: 20 }}>
      <section
        className="card"
        style={{
          padding: 20,
          display: "grid",
          gap: 12,
          background:
            "linear-gradient(135deg, rgba(16,21,48,0.96), rgba(39,76,119,0.88) 55%, rgba(244,162,97,0.92))",
          color: "white",
          border: "none",
        }}
      >
        <Link href="/admin/catalog" style={{ color: "white", opacity: 0.82, textDecoration: "none" }}>
          ← Torna alla dashboard
        </Link>
        <h1 style={{ margin: 0, fontSize: 34, letterSpacing: "-0.04em" }}>Catalogo Backend Prodotti</h1>
        <p style={{ margin: 0, maxWidth: 920, lineHeight: 1.55 }}>
          Gestisci il catalogo prodotti dal backend: immagini multiple, anteprima scheda, descrizioni breve/lunga,
          prodotti correlati e Structured Output JSON leggibile dall&apos;AI. Ogni prodotto viene sincronizzato nella
          knowledge dell&apos;agente selezionato.
        </p>
      </section>

      <section className="card" style={{ padding: 18, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <strong>Agente target</strong>
            <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
              Il catalogo e la knowledge vengono salvati sull&apos;agente selezionato.
            </span>
          </div>
          <select
            value={selectedClientId}
            onChange={(event) => setSelectedClientId(event.target.value)}
            style={{ minWidth: 280, borderRadius: 12, border: "1px solid var(--line)", padding: "10px 12px" }}
          >
            <option value="">Seleziona agente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} ({client.slug})
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void handleImportCatalog()} disabled={importing || !selectedClientId} style={secondaryButtonStyle}>
            {importing ? "Import in corso..." : "Importa catalogo EasyVox"}
          </button>
        </div>

        {status ? (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(244,162,97,0.12)",
              border: "1px solid rgba(244,162,97,0.32)",
            }}
          >
            {status}
          </div>
        ) : null}
      </section>

      <section style={{ display: "grid", gap: 20, gridTemplateColumns: "minmax(320px, 460px) minmax(0, 1fr)" }}>
        <form className="card" onSubmit={handleSubmit} style={{ padding: 20, display: "grid", gap: 14, alignSelf: "start" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <h2 style={{ margin: 0 }}>{form.productId ? "Modifica prodotto" : "Nuovo prodotto"}</h2>
            <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
              {selectedClient ? `Agente: ${selectedClient.name}` : "Seleziona un agente"}
            </span>
          </div>

          <label style={fieldStyle}>
            <span>Titolo</span>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} style={inputStyle} required />
          </label>

          <label style={fieldStyle}>
            <span>Descrizione breve</span>
            <textarea
              value={form.shortDescription}
              onChange={(event) => setForm({ ...form, shortDescription: event.target.value })}
              style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
              required
            />
          </label>

          <label style={fieldStyle}>
            <span>Descrizione estesa</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              style={{ ...inputStyle, minHeight: 140, resize: "vertical" }}
              required
            />
          </label>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
            <label style={fieldStyle}>
              <span>Prezzo EUR</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
                style={inputStyle}
                required
              />
            </label>

            <label style={fieldStyle}>
              <span>Sconto %</span>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={form.discountPercent}
                onChange={(event) => setForm({ ...form, discountPercent: event.target.value })}
                style={inputStyle}
                required
              />
            </label>
          </div>

          <label style={fieldStyle}>
            <span>URL prodotto</span>
            <input
              type="url"
              value={form.productUrl}
              onChange={(event) => setForm({ ...form, productUrl: event.target.value })}
              style={inputStyle}
              required
            />
          </label>

          <label style={fieldStyle}>
            <span>Slug personalizzato opzionale</span>
            <input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} style={inputStyle} />
          </label>

          <label style={fieldStyle}>
            <span>Prodotti correlati (ID separati da virgola)</span>
            <input
              value={form.relatedProductIds}
              onChange={(event) => setForm({ ...form, relatedProductIds: event.target.value })}
              style={inputStyle}
              placeholder="evx-001, evx-003"
            />
          </label>

          <label style={fieldStyle}>
            <span>Immagini</span>
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={inputStyle} />
            <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
              {uploading ? "Upload in corso..." : `${form.imageAssetIds.length} immagini collegate`}
            </span>
          </label>

          <label style={fieldStyle}>
            <span>URL immagini esterne (una per riga)</span>
            <textarea
              value={form.externalImageUrls}
              onChange={(event) => setForm({ ...form, externalImageUrls: event.target.value })}
              style={{ ...inputStyle, minHeight: 96, resize: "vertical" }}
              placeholder={"https://easyvox.app/images/prodotto-1.jpg\nhttps://easyvox.app/images/prodotto-2.jpg"}
            />
          </label>

          {imagePreviews.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              <strong>Preview immagini collegate</strong>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))" }}>
                {imagePreviews.map((image) => (
                  <div key={image.id} style={{ display: "grid", gap: 6 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.id}
                      style={{ width: "100%", height: 92, objectFit: "cover", borderRadius: 12 }}
                    />
                    <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{image.id}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gap: 10,
              padding: 14,
              borderRadius: 16,
              border: "1px solid var(--line)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(243,247,251,0.9))",
            }}
          >
            <strong>Anteprima scheda prodotto</strong>
            <div style={{ display: "grid", gap: 8 }}>
              <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                {(form.slug || form.title || "nuovo-prodotto").trim() || "nuovo-prodotto"}
              </span>
              <strong style={{ fontSize: 20 }}>{form.title || "Titolo prodotto"}</strong>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
                {form.shortDescription || "Descrizione breve per anteprima in chat e catalogo."}
              </p>
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                {form.description || "Descrizione estesa visualizzata nella scheda prodotto."}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={badgeStyle}>EUR {previewPrice.toFixed(2)}</span>
                <span style={badgeStyle}>Sconto {previewDiscount}%</span>
                <span style={badgeStyle}>Finale EUR {previewDiscountedPrice.toFixed(2)}</span>
              </div>
              <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                Correlati: {previewRelatedIds.length > 0 ? previewRelatedIds.join(", ") : "nessuno"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="submit" disabled={saving || uploading || importing || !selectedClientId} style={primaryButtonStyle}>
              {saving ? "Salvataggio..." : form.productId ? "Aggiorna prodotto" : "Crea prodotto"}
            </button>
            <button type="button" onClick={resetForm} style={secondaryButtonStyle}>
              Nuovo form
            </button>
          </div>
        </form>

        <section className="card" style={{ padding: 20, display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0 }}>Catalogo salvato</h2>
              <p className="mono" style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
                {products.length} prodotti per l&apos;agente selezionato
              </p>
            </div>
          </div>

          {products.length === 0 ? (
            <p style={{ margin: 0 }}>Nessun prodotto caricato per questo agente.</p>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {products.map((product) => (
                <article
                  key={product.id}
                  style={{
                    display: "grid",
                    gap: 14,
                    border: "1px solid var(--line)",
                    borderRadius: 18,
                    padding: 16,
                    background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(243,247,251,0.92))",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 18 }}>{product.title}</strong>
                        <span style={badgeStyle}>-{product.discountPercent}%</span>
                      </div>
                      <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                        {product.slug} · {product.discountedPriceFormatted} · {product.images.length} immagini
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => startEdit(product)} style={secondaryButtonStyle}>
                        Modifica
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(product)}
                        disabled={deletingProductId === product.id}
                        style={dangerButtonStyle}
                      >
                        {deletingProductId === product.id ? "Elimino..." : "Elimina"}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
                    {product.images.map((image) => (
                      <div key={image.id} style={{ display: "grid", gap: 6 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image.url} alt={image.filename} style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 14 }} />
                        <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{image.filename}</span>
                      </div>
                    ))}
                  </div>

                  <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>{product.shortDescription}</p>
                  <p style={{ margin: 0, lineHeight: 1.6 }}>{product.longDescription}</p>
                  <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                    Correlati: {product.relatedProductIds.length > 0 ? product.relatedProductIds.join(", ") : "nessuno"}
                  </span>

                  <div style={{ display: "grid", gap: 8 }}>
                    <strong>Structured Output JSON</strong>
                    <pre
                      style={{
                        margin: 0,
                        padding: 14,
                        borderRadius: 14,
                        background: "#101530",
                        color: "#e8f2ff",
                        overflowX: "auto",
                        fontSize: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      {JSON.stringify(product.structuredOutput, null, 2)}
                    </pre>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

const fieldStyle = {
  display: "grid",
  gap: 6,
} as const;

const inputStyle = {
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: "11px 12px",
  background: "white",
} as const;

const primaryButtonStyle = {
  border: "none",
  borderRadius: 999,
  padding: "11px 16px",
  background: "#1d3557",
  color: "white",
  cursor: "pointer",
} as const;

const secondaryButtonStyle = {
  border: "1px solid var(--line)",
  borderRadius: 999,
  padding: "11px 16px",
  background: "white",
  color: "inherit",
  cursor: "pointer",
} as const;

const dangerButtonStyle = {
  border: "1px solid rgba(176, 43, 43, 0.26)",
  borderRadius: 999,
  padding: "11px 16px",
  background: "rgba(176, 43, 43, 0.08)",
  color: "#8b1e1e",
  cursor: "pointer",
} as const;

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "5px 10px",
  background: "rgba(29,53,87,0.08)",
  color: "#1d3557",
  fontSize: 12,
  fontWeight: 700,
} as const;
