import { del, get, put } from "@vercel/blob";

export function ensureBlobToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN non configurato");
  }
}

export function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadPrivateBlob(clientId: string, file: File) {
  ensureBlobToken();
  const safeName = sanitizeFilename(file.name || "file");
  const pathname = `${clientId}/${Date.now()}-${safeName}`;

  return put(pathname, file, {
    access: "private",
    addRandomSuffix: true,
    contentType: file.type || undefined,
  });
}

export async function downloadPrivateBlob(pathname: string) {
  ensureBlobToken();
  return get(pathname, {
    access: "private",
  });
}

export async function deleteBlob(pathnameOrUrl: string) {
  ensureBlobToken();
  await del(pathnameOrUrl);
}
