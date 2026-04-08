import tseslint from "typescript-eslint";
import nawhasRules from "./eslint-rules/index.js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...tseslint.configs.recommended,
  {
    plugins: {
      nawhas: nawhasRules,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": "warn",
      "nawhas/require-dynamic-for-headers-cookies": "warn",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", ".next/**"],
  },
];
