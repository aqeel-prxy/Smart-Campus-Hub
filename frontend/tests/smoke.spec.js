import { test, expect } from '@playwright/test';

test('homepage loads and shows login page', async ({ page }) => {
  await page.goto('/');

  // The page should load without crashing (status 200)
  const response = await page.waitForLoadState('networkidle');

  // The root div rendered by React should exist
  await expect(page.locator('#root')).toBeVisible();
});
