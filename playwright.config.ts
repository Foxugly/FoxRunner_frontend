import { defineConfig, devices } from '@playwright/test';

const PORT = process.env['E2E_PORT'] ?? '4200';
const BASE_URL = process.env['E2E_BASE_URL'] ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['line'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    // FoxRunner is French-first; pin the locale so the browser-language auto-detect
    // in LanguageService resolves to 'fr' and the FR assertions below stay valid.
    locale: 'fr-FR',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env['E2E_SKIP_WEBSERVER']
    ? undefined
    : {
        command: `npm start -- --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
