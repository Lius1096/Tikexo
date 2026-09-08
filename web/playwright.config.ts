import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Playwright ne matche par défaut que *.spec.ts / *.test.ts — nos fichiers
  // sont nommés *.e2e.ts, il faut donc l'expliciter sinon "No tests found".
  testMatch: '**/*.e2e.ts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
