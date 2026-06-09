import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost:3000",
      },
    },
    globals: true,
    setupFiles: "./tests/setup.ts",
    // tests/mongo/** is the mongo-mode smoke suite — it needs a real mongod and
    // a node environment (see vitest.mongo.config.ts), so keep it out of the
    // default jsdom suite. Run it with `pnpm test:mongo`.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/*.config.*",
      "tests/mongo/**",
    ],
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
