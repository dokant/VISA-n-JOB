/**
 * Local private file storage (PRD R-210, PRD §2 "클라우드 파일 버킷 → 로컬 비공개 저장소 어댑터").
 *
 * Files live under `storage/private/` at the repository root (or `PRIVATE_STORAGE_DIR`): outside
 * `public/` and outside the web root, and git-ignored (`/storage/`). Nothing serves this folder
 * directly; a file is read only through `/api/files/[token]` after the signed-URL check and the
 * permission check (src/app/api/files/[token]/route.ts).
 *
 * Keys are generated here (`intro-confirm/{interviewId}/{uuid}.{ext}`), never taken from a user, and
 * every read re-validates the key shape and checks that the resolved path stays inside the root
 * (no `..`, no absolute paths). Uploads are refused unless the bytes are a PDF / JPEG / PNG
 * (magic numbers, not the browser's MIME claim) within INTRO_CONFIRM_MAX_BYTES.
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { INTRO_CONFIRM_MAX_BYTES, INTRO_CONFIRM_TYPES } from "@/config/limits";

export type IntroConfirmType = (typeof INTRO_CONFIRM_TYPES)[number];

const EXTENSION: Record<IntroConfirmType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** `intro-confirm/{cuid}/{uuid}.{pdf|jpg|png}` */
const KEY =
  /^intro-confirm\/[a-z0-9]{8,40}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png)$/;

export function privateStorageRoot(): string {
  const configured = process.env.PRIVATE_STORAGE_DIR?.trim();
  return path.resolve(configured ? configured : path.join(process.cwd(), "storage", "private"));
}

export function isStorageKey(value: unknown): value is string {
  return typeof value === "string" && KEY.test(value);
}

/** Absolute path of a key, or null when the key is malformed or would leave the root. */
export function storagePath(key: string): string | null {
  if (!isStorageKey(key)) return null;
  const root = privateStorageRoot();
  const full = path.resolve(root, ...key.split("/"));
  return full.startsWith(root + path.sep) ? full : null;
}

/** The file type from its first bytes (PDF, JPEG, PNG), or null. */
export function sniffType(bytes: Uint8Array): IntroConfirmType | null {
  const b = bytes;
  if (
    b.length >= 5 &&
    b[0] === 0x25 &&
    b[1] === 0x50 &&
    b[2] === 0x44 &&
    b[3] === 0x46 &&
    b[4] === 0x2d
  ) {
    return "application/pdf"; // %PDF-
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return "image/png";
  }
  return null;
}

export type StoreResult =
  | { ok: true; key: string; mime: IntroConfirmType; size: number }
  | { ok: false; code: "FILE_EMPTY" | "FILE_TOO_LARGE" | "FILE_TYPE" };

/** Checks and writes one 소개 확인서 of an interview. Returns the new storage key. */
export async function storeIntroConfirm(
  interviewId: string,
  bytes: Uint8Array,
): Promise<StoreResult> {
  if (bytes.length === 0) return { ok: false, code: "FILE_EMPTY" };
  if (bytes.length > INTRO_CONFIRM_MAX_BYTES) return { ok: false, code: "FILE_TOO_LARGE" };
  const mime = sniffType(bytes);
  if (!mime) return { ok: false, code: "FILE_TYPE" };
  const key = `intro-confirm/${interviewId}/${randomUUID()}.${EXTENSION[mime]}`;
  const full = storagePath(key);
  if (!full) throw new Error("storage: generated key is invalid");
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes, { flag: "wx" });
  return { ok: true, key, mime, size: bytes.length };
}

/** Reads a stored file, or null when the key is malformed or the file is missing. */
export async function readStoredFile(key: string): Promise<Buffer | null> {
  const full = storagePath(key);
  if (!full) return null;
  try {
    return await readFile(full);
  } catch {
    return null;
  }
}

/** MIME type of a stored key from its extension (keys are generated from the sniffed type). */
export function mimeOfKey(key: string): IntroConfirmType | null {
  if (!isStorageKey(key)) return null;
  if (key.endsWith(".pdf")) return "application/pdf";
  if (key.endsWith(".jpg")) return "image/jpeg";
  return "image/png";
}
