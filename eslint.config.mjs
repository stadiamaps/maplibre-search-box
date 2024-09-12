// eslint.config.mjs
import typescript from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
    },
    plugins: {
      "@typescript-eslint": typescript,
      prettier: prettier,
    },
    rules: {
      ...typescript.configs["eslint-recommended"].rules,
      ...typescript.configs.recommended.rules,
      "prettier/prettier": "error",
    },
  },
  {
    ignores: [
      ".history",
      ".husky",
      ".vscode",
      "coverage",
      "dist",
      "node_modules",
      "vite.config.ts",
    ],
  },
];
