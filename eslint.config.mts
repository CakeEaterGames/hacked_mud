import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import pluginImport from "eslint-plugin-import-x";
import eslintPluginPrettier from "eslint-plugin-prettier";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  // ──────────────────────────────────────────────
  // Global ignores
  // ──────────────────────────────────────────────
  globalIgnores([
    "**/node_modules/**",
    "**/dist/**",
    "**/.quasar/**",
    "**/.elysia/**",
    "**/coverage/**",
    "**/package-lock.json",
    "**/pnpm-lock.yaml",
    "**/yarn.lock",
    "**/bun.lockb",
  ]),

  // ──────────────────────────────────────────────
  // Base: All JS/TS files
  // ──────────────────────────────────────────────
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    extends: [js.configs.recommended],
    plugins: {
      import: pluginImport,
    },
    rules: {
      // Import order & duplicates
      "import/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc" },
        },
      ],
      "import/no-duplicates": "error",

      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-unused-vars": "off", // TS handles this
      "prefer-const": "warn",
      "no-var": "error",
    },
  },

  // ──────────────────────────────────────────────
  // TypeScript recommended (type-checked)
  // ──────────────────────────────────────────────
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.strictTypeChecked,

  // ──────────────────────────────────────────────
  // All TS/TSX files (core TS rules)
  // ──────────────────────────────────────────────
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      // ── TypeScript ──────────────────────────
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^log$|^_",
          argsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/promise-function-async": "warn",
      "@typescript-eslint/require-await": "warn",

      // Elysia-specific relaxations
      "@typescript-eslint/only-throw-error": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/ban-ts-comment": "off",

      // ── Prettier ────────────────────────────
      "prettier/prettier": ["error", {}, { usePrettierrc: true }],
    },
  },

  // ──────────────────────────────────────────────
  // Vue essential rules
  // ──────────────────────────────────────────────
  ...pluginVue.configs["flat/essential"],

  // ──────────────────────────────────────────────
  // TS + Vue files
  // ──────────────────────────────────────────────
  {
    files: ["**/*.{ts,vue}"],
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    },
  },

  // ──────────────────────────────────────────────
  // Prettier: must be last to override others
  // ──────────────────────────────────────────────
  eslintConfigPrettier,
]);
