import tseslint from "typescript-eslint";
import globals from "globals";
import eslintPluginPrettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  ...tseslint.configs.recommendedTypeChecked,
  // ...tseslint.configs.strictTypeChecked,
  // Disable ESLint rules that conflict with Prettier
  eslintConfigPrettier,
  {
    files: ["**/*.{ts,tsx}"],
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
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/promise-function-async": "warn",
      "@typescript-eslint/require-await": "warn",
      "prefer-const": "warn",
      "@typescript-eslint/only-throw-error": "off", //Потому что Elysia кидает статусы
      "@typescript-eslint/no-namespace": "off", //Потому что мы используем нэймспэйсы по рекомендации Elysia
      "@typescript-eslint/ban-ts-comment": "off",
      "prettier/prettier": ["error", {}, { usePrettierrc: true }], //Таким образом линтер даст ошибку если prettier ещё не отработал

      // "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^log$", // Игнорировать неиспользованные импорты лога. // import { log } from "@utils/logger";
          argsIgnorePattern: "^_",
        },
      ],

      // "no-cond-assign": "error", // Не работает :(
    },
  }
);
