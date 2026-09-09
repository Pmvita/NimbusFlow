import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["node_modules/**", ".aws-sam/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": "error",
    },
  },
  {
    // The logger is the one place in the functions allowed to write to stdout/stderr;
    // the smoke script is a CLI tool and prints its results.
    files: ["functions/shared/logger.ts", "tests/integration/**"],
    rules: { "no-console": "off" },
  },
  {
    // Plain Node script, not TypeScript, so it needs the runtime globals declared.
    files: ["tests/integration/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        fetch: "readonly",
        process: "readonly",
        setTimeout: "readonly",
      },
    },
  },
);
