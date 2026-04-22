import { expect, test, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env['E2E_EMAIL'] ?? 'admin@local.test';
const ADMIN_PASSWORD = process.env['E2E_PASSWORD'] ?? 'adminadmin123456';

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test.describe('FoxRunner smoke', () => {
  test('unauth visit redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('FoxRunner')).toBeVisible();
  });

  test('login flow lands on dashboard and menubar shows feature entries', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/login');

    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Mot de passe').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /Se connecter/ }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();

    for (const label of ['Scénarios', 'Slots', 'Jobs', 'Plan', 'Historique']) {
      await expect(page.getByRole('menuitem', { name: label })).toBeVisible();
    }

    expect(errors).toEqual([]);
  });

  test('logout returns to /login and clears menubar', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Mot de passe').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /Se connecter/ }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.getByRole('button', { name: 'Déconnexion' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
