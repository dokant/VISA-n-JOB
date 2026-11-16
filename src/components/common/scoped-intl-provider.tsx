import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

type Tree = { [key: string]: string | Tree };

/** Namespaces the locale layout already sends to the client (kept inside the nested provider). */
const BASE_NAMESPACES = ["common", "nav", "visa", "visaType"];

function pick(messages: Tree, paths: readonly string[]): Tree {
  const out: Tree = {};
  for (const path of paths) {
    const parts = path.split(".");
    let src: string | Tree | undefined = messages;
    let dst: Tree = out;
    for (let i = 0; i < parts.length; i++) {
      if (src === undefined || typeof src === "string") break;
      const part = parts[i];
      src = src[part];
      if (src === undefined) break;
      if (i === parts.length - 1) dst[part] = src;
      else dst = (dst[part] ??= {}) as Tree;
    }
  }
  return out;
}

/**
 * Sends only the message subtrees a client form needs (e.g. "seeker.login", "errors"), so a page
 * does not ship the whole messages file to the browser (R-103 payload).
 */
export async function ScopedIntlProvider({
  namespaces,
  children,
}: {
  namespaces: readonly string[];
  children: ReactNode;
}) {
  const messages = (await getMessages()) as Tree;
  return (
    <NextIntlClientProvider messages={pick(messages, [...BASE_NAMESPACES, ...namespaces])}>
      {children}
    </NextIntlClientProvider>
  );
}
