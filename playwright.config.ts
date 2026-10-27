import { defineConfig, devices } from '@playwright/test';

/** Configuration E2E réutilisant le serveur Angular déjà lancé si possible. */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: [['list']],
  outputDir: 'playwright-report/test-results',
  use: {
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://127.0.0.1:4200',
    storageState: {
      cookies: [],
      origins: [{
        origin: 'http://127.0.0.1:4200',
        localStorage: [{ name: 'karak-home-intro-seen-v1', value: 'true' }],
      }],
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'cmd /c "npm start -- --host 127.0.0.1 --port 4200"',
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
