import { defineConfig, devices } from '@playwright/test';

// No process import needed!

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  
  // @ts-ignore
  forbidOnly: !!process.env.CI,
  // @ts-ignore
  retries: process.env.CI ? 2 : 0,
  // @ts-ignore
  workers: process.env.CI ? 1 : undefined,
  
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true, // simplified for JS
    timeout: 120 * 1000,
  },
});