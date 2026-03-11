import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    name: "integration",
    include: ["src/tests/integration/**/*.test.ts"],
    environment: "node",
    globals: true,
    testTimeout: 30_000,
  },
});
