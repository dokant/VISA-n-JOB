"use client";

import { useEffect } from "react";

import { notoSansSC } from "@/lib/fontsZh";

/** Adds the Noto Sans SC variable class to <html> (zh only). Loaded lazily by ZhFontLoader. */
export default function ZhFont() {
  useEffect(() => {
    document.documentElement.classList.add(notoSansSC.variable);
  }, []);
  return null;
}
