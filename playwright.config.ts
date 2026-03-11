import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  use: {
    baseURL,
    extraHTTPHeaders: {
      "x-dev-user-id": process.env.E2E_DEFAULT_CLERK_USER_ID ?? "local_user_clerk_id",
    },
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "ALLOW_DEV_BYPASS_AUTH=1 pnpm dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
