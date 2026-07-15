// Flat ESLint config. Two tiers:
//  - src/ (the app): type-aware, so the rules tsc cannot enforce — React-hooks
//    dependency correctness and floating promises — are caught.
//  - scripts/ (the data pipeline + harnesses, ~4,000 lines that regenerate the
//    sacred texts): the recommended non-type-aware rules. Node CLI code, so
//    console is fine and no React plugins apply — but an unused variable or a
//    shadowed builtin in a builder is exactly as dangerous as one in src/.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "ios", "public", "*.config.*"] },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },
  {
    files: ["scripts/**/*.{ts,mjs}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      // The harnesses assert against loosely-shaped JSON corpora; `any` at that
      // boundary is deliberate, not sloppy.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // e2e/ (the committed browser suite, v1.18.1 FID-QUAL-001): Playwright
    // specs run under Node but drive browser code in page.evaluate callbacks,
    // so both global sets apply. Non-type-aware, like scripts/.
    files: ["e2e/**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  }
);
