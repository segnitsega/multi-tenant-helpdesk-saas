import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma-generated contract types (prisma contract emit)
    "prisma/contract.d.ts",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/server/db/system",
              message:
                "systemDb bypasses RLS. Import it only from server/auth, server/tenancy, server/jobs, app/api/webhooks, or tests.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/server/auth/**/*.{ts,tsx}",
      "src/server/tenancy/**/*.{ts,tsx}",
      "src/server/services/**/*.{ts,tsx}",
      "src/server/jobs/**/*.{ts,tsx}",
      "src/app/api/webhooks/**/*.{ts,tsx}",
      "src/server/db/system.ts",
      "tests/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);

export default eslintConfig;
