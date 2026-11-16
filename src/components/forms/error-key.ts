/** "BIZ_REG_NO_TAKEN" → "bizRegNoTaken" (STANDARD 3.6 lowerCamelCase key segments). */
export function codeToKey(code: string): string {
  return code.toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}
