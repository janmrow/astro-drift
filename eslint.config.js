import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "dist",
      "_local", 
      "node_modules", 
      "playwright-report", 
      "test-results"
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    files: ["tests/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
  },

  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["src/**/*.ts", "tests/**/*.ts"],
  })),

  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.tests.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];