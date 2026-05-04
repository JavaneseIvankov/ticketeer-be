import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  test: {
    environment: "node",
    include: ["tests/e2e/*.e2e.test.ts", "tests/e2e/**/*.e2e.test.ts"],
    globalSetup: ["./tests/e2e/setup/global-setup.ts"],
    setupFiles: ["./tests/e2e/setup/test-setup.ts"],
    fileParallelism: false,
    passWithNoTests: true,
  },
});
