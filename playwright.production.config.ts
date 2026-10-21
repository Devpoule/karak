import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env['PLAYWRIGHT_PRODUCTION_PORT'] ?? 4300);
const baseURL = process.env['PLAYWRIGHT_PRODUCTION_BASE_URL'] ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: [['list']],
  outputDir: 'playwright-report/production-test-results',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium-production',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `node scripts/serve-production.mjs dist/karak/browser --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
