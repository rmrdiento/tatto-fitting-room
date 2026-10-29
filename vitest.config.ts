import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Playwright specs live in e2e/ and run via `npm run e2e`.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
