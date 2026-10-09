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
    // Бот и облако из папки discord — отдельные программы со своими
    // зависимостями и без сборки Next. Настройки сайта к ним отношения
    // не имеют: здесь CommonJS у бота и `export default` у воркера, а
    // правила для приложения Next к ним неприменимы.
    "discord/**",
  ]),
]);

export default eslintConfig;
