import { del, get, put } from "@vercel/blob";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const LOCAL_STORAGE_ROOT =
  process.env.VERCEL === "1" ? path.join("/tmp", ".local-blob") : path.join(process.cwd(), ".local-blob");
const SUPABASE_STORAGE_BUCKET = "product-media";

type BlobUploadResult = {
  url: string;
  pathname: string;
};

type BlobDownloadResult = {
  downloadUrl: string | null;
  data: Uint8Array | null;
};

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function isVercelRuntime() {
  return process.env.VERCEL === "1";
}

function assertBlobConfiguredInProduction() {
  if (isVercelRuntime() && !hasBlobToken()) {
    throw new Error("BLOB_READ_WRITE_TOKEN non configurato in produzione");
  }
}

function hasSupabaseStorageConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseStorageBaseUrl() {
  const base = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (!base) {
    throw new Error("SUPABASE_URL non configurato");
  }
  return `${base}/storage/v1`;
}

function getSupabaseStorageHeaders(contentType?: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY non configurato");
  }

  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    ...(contentType ? { "content-type": contentType } : {}),
  };
}

let ensureSupabaseBucketPromise: Promise<void> | null = null;

async function ensureSupabaseBucket() {
  if (!hasSupabaseStorageConfig()) return;
  if (ensureSupabaseBucketPromise) return ensureSupabaseBucketPromise;

  ensureSupabaseBucketPromise = (async () => {
    const response = await fetch(`${getSupabaseStorageBaseUrl()}/bucket`, {
      method: "POST",
      headers: getSupabaseStorageHeaders("application/json"),
      body: JSON.stringify({
        id: SUPABASE_STORAGE_BUCKET,
        name: SUPABASE_STORAGE_BUCKET,
        public: true,
        allowedMimeTypes: ["image/*"],
      }),
    });

    if (response.ok) return;

    const text = await response.text();
    if (response.status === 409 || text.toLowerCase().includes("already exists")) return;

    throw new Error(text || "Creazione bucket Supabase fallita");
  })();

  try {
    await ensureSupabaseBucketPromise;
  } catch (error) {
    ensureSupabaseBucketPromise = null;
    throw error;
  }
}

export function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function ensureSafeRelativePath(relativePath: string) {
  if (relativePath.includes("..")) {
    throw new Error("Path non valido");
  }
}

function localPathFromRelative(relativePath: string) {
  ensureSafeRelativePath(relativePath);
  return path.join(LOCAL_STORAGE_ROOT, relativePath);
}

async function uploadLocalBlob(clientId: string, file: File): Promise<BlobUploadResult> {
  const safeName = sanitizeFilename(file.name || "file");
  const relativePath = `${clientId}/${Date.now()}-${safeName}`;
  const fullPath = localPathFromRelative(relativePath);

  await mkdir(path.dirname(fullPath), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);

  return {
    url: `local://${relativePath}`,
    pathname: relativePath,
  };
}

async function uploadSupabaseBlob(clientId: string, file: File): Promise<BlobUploadResult> {
  await ensureSupabaseBucket();

  const safeName = sanitizeFilename(file.name || "file");
  const pathname = `${clientId}/${Date.now()}-${safeName}`;
  const response = await fetch(
    `${getSupabaseStorageBaseUrl()}/object/${SUPABASE_STORAGE_BUCKET}/${pathname}`,
    {
      method: "POST",
      headers: {
        ...getSupabaseStorageHeaders(file.type || "application/octet-stream"),
        "x-upsert": "true",
      },
      body: Buffer.from(await file.arrayBuffer()),
    },
  );

  if (!response.ok) {
    throw new Error((await response.text()) || "Upload Supabase fallito");
  }

  return {
    url: `${process.env.SUPABASE_URL?.trim().replace(/\/+$/, "")}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${pathname}`,
    pathname,
  };
}

export async function uploadPrivateBlob(clientId: string, file: File): Promise<BlobUploadResult> {
  if (hasSupabaseStorageConfig()) {
    return uploadSupabaseBlob(clientId, file);
  }

  assertBlobConfiguredInProduction();

  if (!hasBlobToken()) {
    return uploadLocalBlob(clientId, file);
  }

  const safeName = sanitizeFilename(file.name || "file");
  const pathname = `${clientId}/${Date.now()}-${safeName}`;

  const result = await put(pathname, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || undefined,
  });

  return {
    url: result.url,
    pathname: result.pathname,
  };
}

export async function downloadPrivateBlob(pathname: string): Promise<BlobDownloadResult | null> {
  if (hasSupabaseStorageConfig()) {
    return {
      downloadUrl: `${process.env.SUPABASE_URL?.trim().replace(/\/+$/, "")}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${pathname}`,
      data: null,
    };
  }

  assertBlobConfiguredInProduction();

  if (!hasBlobToken()) {
    try {
      const data = await readFile(localPathFromRelative(pathname));
      return {
        downloadUrl: null,
        data,
      };
    } catch {
      return null;
    }
  }

  const result = await get(pathname, {
    access: "public",
  });

  if (!result) return null;

  const arrayBuffer = await new Response(result.stream).arrayBuffer();

  return {
    downloadUrl: null,
    data: new Uint8Array(arrayBuffer),
  };
}

export async function deleteBlob(pathnameOrUrl: string) {
  if (hasSupabaseStorageConfig()) {
    const pathname = pathnameOrUrl.startsWith("http")
      ? pathnameOrUrl.split(`/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/`)[1] ?? pathnameOrUrl
      : pathnameOrUrl.replace(/^local:\/\//, "");

    const response = await fetch(
      `${getSupabaseStorageBaseUrl()}/object/${SUPABASE_STORAGE_BUCKET}/${pathname}`,
      {
        method: "DELETE",
        headers: getSupabaseStorageHeaders(),
      },
    );

    if (!response.ok && response.status !== 404) {
      throw new Error((await response.text()) || "Eliminazione file Supabase fallita");
    }
    return;
  }

  assertBlobConfiguredInProduction();

  if (!hasBlobToken()) {
    const relative = pathnameOrUrl.startsWith("local://")
      ? pathnameOrUrl.replace("local://", "")
      : pathnameOrUrl;

    await rm(localPathFromRelative(relative), { force: true });
    return;
  }

  await del(pathnameOrUrl);
}
