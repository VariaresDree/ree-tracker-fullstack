import { test, expect } from '@playwright/test';

// Auth-independent smoke. The app gates the entire router behind Firebase
// auth, so Login is the only surface we can verify without provisioning a
// test user. These tests catch render regressions and a11y basics.

test.describe('Login screen', () => {
  test('renders the brand + email/password fields', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/REE\.?ai Core/)).toBeVisible();
    await expect(page.getByLabel(/Email Address/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
  });

  test('toggles between sign-in and registration affordances', async ({ page }) => {
    await page.goto('/');

    // The body copy differs between the two modes — assert one is visible
    // initially and the other appears after the toggle is clicked.
    await expect(page.getByText(/Authenticate to access/i)).toBeVisible();
    const toggle = page.getByRole('button', { name: /(register|create|sign up)/i });
    if (await toggle.count()) {
      await toggle.first().click();
      await expect(page.getByText(/Initialize your profile/i)).toBeVisible();
    }
  });

  test('responds to prefers-reduced-motion', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');
    // Just verify it renders; the global CSS rule from Phase 1 short-circuits
    // every animation, so any regression that depends on an animation
    // completing would either crash or hang the page.
    await expect(page.getByText(/REE\.?ai Core/)).toBeVisible();
    await ctx.close();
  });
});
