import { readFileSync } from "node:fs";
import path from "node:path";

export const LOCALES = ["ko", "en", "vi", "ru", "zh", "uz"] as const;
export type Locale = (typeof LOCALES)[number];

type Tree = { [key: string]: string | Tree };

const cache = new Map<string, Tree>();

/** Reads a message value from messages/{locale}.json by dot key (tests compare rendered text). */
export function msg(locale: string, key: string): string {
  let tree = cache.get(locale);
  if (!tree) {
    tree = JSON.parse(
      readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8"),
    ) as Tree;
    cache.set(locale, tree);
  }
  let node: string | Tree = tree;
  for (const part of key.split(".")) {
    if (typeof node === "string") throw new Error(`not an object at ${key}`);
    node = node[part];
    if (node === undefined) throw new Error(`missing message ${locale}:${key}`);
  }
  if (typeof node !== "string") throw new Error(`not a string: ${key}`);
  return node;
}

export const demandURL = () => process.env.E2E_DEMAND_URL ?? "http://127.0.0.1:3101";
