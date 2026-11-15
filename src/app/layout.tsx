import type { ReactNode } from "react";

import "./globals.css";

// Pass-through root layout. <html>/<body> are rendered by src/app/[locale]/layout.tsx
// (and later by src/app/admin/layout.tsx for the Korean-only admin area).
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
