import { test, expect } from '@playwright/test';
import { signIn } from './helpers';

// Screenshots of every theme on the main screens at four widths, to look
// over by eye after a design change. Not a check, and not run by default:
//   VISUAL_SWEEP=1 npm run e2e:authed -- visual-sweep
// Writes test-results/visual-sweep/<width>/<theme>-<screen>.png (the login
// screen first, signed out).

const THEMES = ['Original', 'Light', 'Midnight', 'Paper', 'Cyberpunk', 'Retrowave', 'Forest', 'Ocean', 'Sakura', 'Phosphor', 'Organs', 'Math', 'Electrical'];
const SCREENS: Record<string, string> = {
  today: '/',
  practice: '/practice',
  exams: '/exams',
  progress: '/progress',
  library: '/library',
  appearance: '/account#appearance',
  simulator: '/simulator',
  focus: '/focus',
};
const WIDTHS = [1280, 820, 390, 360];

test.skip(!process.env.VISUAL_SWEEP, 'set VISUAL_SWEEP=1 to take the screenshots');

test('visual sweep', async ({ page }) => {
  test.setTimeout(40 * 60_000);
  const shot = (width: number, name: string) => page.screenshot({ path: `test-results/visual-sweep/${width}/${name}.png` });

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 900 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible({ timeout: 20_000 });
    await shot(width, 'login');
  }

  await signIn(page);
  for (const theme of THEMES) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/account#appearance');
    await page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio', { name: new RegExp(`^${theme}`) }).click();
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width < 800 ? 844 : 900 });
      for (const [name, url] of Object.entries(SCREENS)) {
        await page.goto(url);
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeAttached({ timeout: 20_000 });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);
        await shot(width, `${theme.toLowerCase()}-${name}`);
      }
    }
  }
});
