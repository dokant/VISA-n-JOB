import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // STANDARD 4.1: `any` is forbidden.
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // STANDARD 3.6: no hard-coded user-facing strings in localized pages and non-admin components.
    files: ["src/app/\[locale\]/**/*.tsx", "src/components/**/*.tsx"],
    ignores: ["src/components/admin/**", "src/components/ui/**"],
    rules: {
      "react/jsx-no-literals": [
        "error",
        {
          noStrings: true,
          ignoreProps: true,
          allowedStrings: ["·", "/", "*", "-", ":", "(", ")", "|"],
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      "design_handoff_visanjob_homepage/**",
      ".workflow/**",
      "docs/**",
    ],
  },
];

export default eslintConfig;
