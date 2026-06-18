import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  
  use: {
    baseURL: "http://localhost:5173", 
    trace: "on-first-retry",
  },
  
  webServer: {
    command: "npm run dev",
    port: 5173,             
    reuseExistingServer: !process.env.CI,
  },
  
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});