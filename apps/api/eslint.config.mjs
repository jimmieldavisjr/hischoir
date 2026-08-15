import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  globalIgnores(["dist/**", "drizzle/**"]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]);

export default eslintConfig;
