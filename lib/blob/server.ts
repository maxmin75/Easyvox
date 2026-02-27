import { del, get, put } from "@vercel/blob";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const LOCAL_STORAGE_ROOT = path.join(process.cwd(), ".local-blob");

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

export async function uploadPrivateBlob(clientId: string, file: File): Promise<BlobUploadResult> {
  if (!hasBlobToken()) {
    return uploadLocalBlob(clientId, file);
  }

  const safeName = sanitizeFilename(file.name || "file");
  const pathname = `${clientId}/${Date.now()}-${safeName}`;

  const result = await put(pathname, file, {
    access: "private",
    addRandomSuffix: true,
    contentType: file.type || undefined,
  });

  return {
    url: result.url,
    pathname: result.pathname,
  };
}

export async function downloadPrivateBlob(pathname: string): Promise<BlobDownloadResult | null> {
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
    access: "private",
  });

  if (!result) return null;

  return {
    downloadUrl: result.blob.downloadUrl ?? null,
    data: null,
  };
}

export async function deleteBlob(pathnameOrUrl: string) {
  if (!hasBlobToken()) {
    const relative = pathnameOrUrl.startsWith("local://")
      ? pathnameOrUrl.replace("local://", "")
      : pathnameOrUrl;

    await rm(localPathFromRelative(relative), { force: true });
    return;
  }

  await del(pathnameOrUrl);
}
