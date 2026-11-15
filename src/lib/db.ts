/**
 * Prisma client singleton with automatic field encryption (STANDARD 4.2 / 4.7, PRD R-009).
 *
 * Every model field whose name ends in `Enc` — plus `User.totpSecret` (PLAN P0c-2) — is encrypted
 * with `crypto.encrypt` on write and decrypted on read:
 * - writes: create / createMany / createManyAndReturn / update / updateMany / updateManyAndReturn /
 *   upsert, including nested relation writes (create, createMany, connectOrCreate, update,
 *   updateMany, upsert) at any depth;
 * - reads: every operation that returns records (find*, create, update, upsert, delete, …),
 *   including `include` / `select` relations at any depth.
 * Encrypted columns cannot be filtered (random IV): look rows up by the matching `…Hash` column.
 * A `where` that mentions an encrypted field throws instead of silently matching nothing.
 * Raw SQL (`$queryRaw`) bypasses the extension and sees ciphertext only.
 *
 * All app code imports `db` from this file.
 * Recommendation / AuditLog are append-only (BR-09): never call update/delete/upsert on them.
 */
import { Prisma, PrismaClient } from "@prisma/client";

import { decrypt, encrypt } from "./crypto";

/** Encrypted fields that do not follow the `…Enc` naming (WO §5 names kept as-is). */
const EXTRA_ENCRYPTED_FIELDS: Readonly<Record<string, readonly string[]>> = {
  User: ["totpSecret"],
};

type ModelMeta = { encrypted: Set<string>; relations: Map<string, string> };

function buildMeta(): Map<string, ModelMeta> {
  const meta = new Map<string, ModelMeta>();
  for (const model of Prisma.dmmf.datamodel.models) {
    const extra = EXTRA_ENCRYPTED_FIELDS[model.name] ?? [];
    const encrypted = new Set<string>();
    const relations = new Map<string, string>();
    for (const field of model.fields) {
      if (field.kind === "object") relations.set(field.name, field.type);
      if (field.name.endsWith("Enc") || extra.includes(field.name)) {
        if (field.type !== "String" || field.isList) {
          throw new Error(`db: encrypted field ${model.name}.${field.name} must be a String`);
        }
        encrypted.add(field.name);
      }
    }
    meta.set(model.name, { encrypted, relations });
  }
  return meta;
}

const MODEL_META = buildMeta();
const ALL_ENCRYPTED = new Set([...MODEL_META.values()].flatMap((m) => [...m.encrypted]));

/** Encrypted field names of a model (for tests and admin PII_VIEW logging). */
export function encryptedFieldsOf(model: string): string[] {
  return [...(MODEL_META.get(model)?.encrypted ?? [])];
}

type Obj = Record<string, unknown>;

function isPlainObject(value: unknown): value is Obj {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

function encryptValue(path: string, value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return encrypt(value);
  if (isPlainObject(value) && "set" in value) {
    return { ...value, set: encryptValue(path, value.set) };
  }
  throw new Error(`db: unsupported write to encrypted field ${path}`);
}

/** Encrypts a create/update data object (or array of them) for `model`, recursing into relations. */
function transformData(model: string, data: unknown): unknown {
  if (Array.isArray(data)) return data.map((d) => transformData(model, d));
  if (!isPlainObject(data)) return data;
  const meta = MODEL_META.get(model);
  if (!meta) return data;
  const out: Obj = {};
  for (const [key, value] of Object.entries(data)) {
    if (meta.encrypted.has(key)) out[key] = encryptValue(`${model}.${key}`, value);
    else if (meta.relations.has(key) && isPlainObject(value)) {
      out[key] = transformNested(meta.relations.get(key) as string, value);
    } else out[key] = value;
  }
  return out;
}

/** `{ where?, data }` wrapper (nested update / updateMany) or a bare data object. */
function transformUpdate(model: string, value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => transformUpdate(model, v));
  if (isPlainObject(value) && "data" in value) {
    return { ...value, data: transformData(model, value.data) };
  }
  return transformData(model, value);
}

function transformUpsert(model: string, value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => transformUpsert(model, v));
  if (!isPlainObject(value)) return value;
  return {
    ...value,
    create: transformData(model, value.create),
    update: transformUpdate(model, value.update),
  };
}

function transformConnectOrCreate(model: string, value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => transformConnectOrCreate(model, v));
  if (!isPlainObject(value)) return value;
  return { ...value, create: transformData(model, value.create) };
}

/** Nested relation write operations for the related `model`. */
function transformNested(model: string, ops: Obj): Obj {
  const out: Obj = {};
  for (const [op, value] of Object.entries(ops)) {
    switch (op) {
      case "create":
        out[op] = transformData(model, value);
        break;
      case "createMany":
        out[op] = isPlainObject(value)
          ? { ...value, data: transformData(model, value.data) }
          : value;
        break;
      case "connectOrCreate":
        out[op] = transformConnectOrCreate(model, value);
        break;
      case "update":
      case "updateMany":
        out[op] = transformUpdate(model, value);
        break;
      case "upsert":
        out[op] = transformUpsert(model, value);
        break;
      default:
        out[op] = value; // connect, disconnect, set, delete, deleteMany
    }
  }
  return out;
}

/** Decrypts a result (record, array of records, nested relations) in place. */
function decryptResult(model: string, value: unknown): unknown {
  if (Array.isArray(value)) {
    for (const item of value) decryptResult(model, item);
    return value;
  }
  if (!isPlainObject(value)) return value;
  const meta = MODEL_META.get(model);
  if (!meta) return value;
  for (const [key, field] of Object.entries(value)) {
    if (meta.encrypted.has(key) && typeof field === "string") value[key] = decrypt(field);
    else if (meta.relations.has(key) && field !== null) {
      decryptResult(meta.relations.get(key) as string, field);
    }
  }
  return value;
}

function findEncryptedFilterKey(where: unknown): string | null {
  if (Array.isArray(where)) {
    for (const w of where) {
      const hit = findEncryptedFilterKey(w);
      if (hit) return hit;
    }
    return null;
  }
  if (!isPlainObject(where)) return null;
  for (const [key, value] of Object.entries(where)) {
    if (ALL_ENCRYPTED.has(key)) return key;
    const hit = findEncryptedFilterKey(value);
    if (hit) return hit;
  }
  return null;
}

const DATA_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
]);

const RECORD_RESULT_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "create",
  "createManyAndReturn",
  "update",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "groupBy",
]);

/** Exported for direct unit tests; production code uses `db`. */
export function encryptArgs(model: string, operation: string, args: unknown): unknown {
  if (!isPlainObject(args)) return args;
  const filterKey = findEncryptedFilterKey(args.where);
  if (filterKey) {
    throw new Error(`db: cannot filter on encrypted field "${filterKey}" — use the …Hash column`);
  }
  if (DATA_OPERATIONS.has(operation) && "data" in args) {
    return { ...args, data: transformData(model, args.data) };
  }
  if (operation === "upsert") {
    return {
      ...args,
      create: transformData(model, args.create),
      update: transformData(model, args.update),
    };
  }
  return args;
}

export const encryptionExtension = Prisma.defineExtension({
  name: "enc-fields",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const result: unknown = await query(encryptArgs(model, operation, args) as typeof args);
        return RECORD_RESULT_OPERATIONS.has(operation) ? decryptResult(model, result) : result;
      },
    },
  },
});

export function withEncryption(client: PrismaClient) {
  return client.$extends(encryptionExtension);
}

export type Db = ReturnType<typeof withEncryption>;

const globalForPrisma = globalThis as unknown as { prisma?: Db };

export const db: Db = globalForPrisma.prisma ?? withEncryption(new PrismaClient());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
