/**
 * R-210 local private storage: outside public/ (and git-ignored), only PDF / JPEG / PNG by their
 * bytes, size cap from limits.ts, generated keys only.
 */
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  INTRO_CONFIRM_MAX_BYTES,
  SERVER_ACTION_BODY_LIMIT,
  SERVER_ACTION_FORM_OVERHEAD_BYTES,
} from "@/config/limits";
import {
  privateStorageRoot,
  readStoredFile,
  sniffType,
  storagePath,
  storeIntroConfirm,
} from "@/lib/files/storage";

const PDF = new Uint8Array([...Buffer.from("%PDF-1.4\n"), 1, 2, 3]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

let previous: string | undefined;
beforeAll(() => {
  previous = process.env.PRIVATE_STORAGE_DIR;
  process.env.PRIVATE_STORAGE_DIR = mkdtempSync(path.join(os.tmpdir(), "vj-storage-"));
});
afterAll(() => {
  if (previous === undefined) delete process.env.PRIVATE_STORAGE_DIR;
  else process.env.PRIVATE_STORAGE_DIR = previous;
});

describe("R-210 private storage", () => {
  it("R-210: the default root is storage/private (not under public/, git-ignored)", () => {
    const saved = process.env.PRIVATE_STORAGE_DIR;
    delete process.env.PRIVATE_STORAGE_DIR;
    try {
      const root = privateStorageRoot();
      expect(root).toBe(path.resolve(process.cwd(), "storage", "private"));
      expect(path.relative(path.resolve(process.cwd(), "public"), root).startsWith("..")).toBe(
        true,
      );
      const gitignore = readFileSync(path.join(process.cwd(), ".gitignore"), "utf8");
      expect(gitignore).toMatch(/^\/storage\/$/m);
    } finally {
      process.env.PRIVATE_STORAGE_DIR = saved;
    }
  });

  it("R-210: PDF / JPEG / PNG are stored by their bytes; other types, empty and oversize files are refused", async () => {
    expect(sniffType(PDF)).toBe("application/pdf");
    expect(sniffType(PNG)).toBe("image/png");
    expect(sniffType(JPG)).toBe("image/jpeg");
    expect(sniffType(new Uint8Array(Buffer.from("<html><script>")))).toBeNull();

    const ok = await storeIntroConfirm("cminterview01", PDF);
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.key).toMatch(/^intro-confirm\/cminterview01\/[0-9a-f-]{36}\.pdf$/);
    const full = storagePath(ok.key);
    expect(full && existsSync(full)).toBe(true);
    expect(full?.startsWith(privateStorageRoot())).toBe(true);
    expect(new Uint8Array((await readStoredFile(ok.key)) ?? [])).toEqual(PDF);

    expect(await storeIntroConfirm("cminterview01", new Uint8Array())).toEqual({
      ok: false,
      code: "FILE_EMPTY",
    });
    expect(
      await storeIntroConfirm("cminterview01", new Uint8Array(Buffer.from("MZ executable"))),
    ).toEqual({ ok: false, code: "FILE_TYPE" });
    const big = new Uint8Array(INTRO_CONFIRM_MAX_BYTES + 1);
    big.set(PDF);
    expect(await storeIntroConfirm("cminterview01", big)).toEqual({
      ok: false,
      code: "FILE_TOO_LARGE",
    });
  });

  it("R-210: the server action body limit follows the upload cap (P2c QA O-2·O-3)", () => {
    expect(typeof SERVER_ACTION_BODY_LIMIT).toBe("number");
    expect(SERVER_ACTION_BODY_LIMIT).toBe(
      INTRO_CONFIRM_MAX_BYTES + SERVER_ACTION_FORM_OVERHEAD_BYTES,
    );
    expect(SERVER_ACTION_BODY_LIMIT).toBeGreaterThan(INTRO_CONFIRM_MAX_BYTES);
    // next.config.ts takes it from limits.ts, no second literal
    const config = readFileSync(path.resolve("next.config.ts"), "utf8");
    expect(config).toContain('from "./src/config/limits"');
    expect(config).toMatch(/bodySizeLimit:\s*SERVER_ACTION_BODY_LIMIT/);
  });

  it("R-210: malformed keys never resolve to a path", async () => {
    for (const key of [
      "../x.pdf",
      "intro-confirm/../../x.pdf",
      "/etc/passwd",
      "intro-confirm/a/b.pdf",
    ]) {
      expect(storagePath(key)).toBeNull();
      expect(await readStoredFile(key)).toBeNull();
    }
  });
});
