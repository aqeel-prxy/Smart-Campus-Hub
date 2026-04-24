import { test, expect } from '@playwright/test';

test.describe('Smart Campus Hub - Core UI Tests', () => {
  
  test('Login page renders correctly', async ({ page }) => {
    // Navigate to your local Vite server
    await page.goto('http://localhost:5173/');

    // Verify the main Gatekeeper elements exist
    await expect(page.locator('h2')).toContainText('Smart Campus Hub');
    await expect(page.getByPlaceholder('Email Address')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

});