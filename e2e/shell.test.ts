import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
test('browser persists a project, reloads it, and initializes Pixi', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const name = '浏览器链路-' + randomUUID().slice(0, 8);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'AI Tileset Studio' })).toBeVisible();
  await expect(page.getByText('画布已就绪', { exact: false })).toBeVisible();
  await page.getByLabel('项目名称').fill(name);
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/projects') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: '创建项目' }).click();
  expect((await response).status()).toBe(201);
  await expect(page.getByRole('listitem').filter({ hasText: name })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('listitem').filter({ hasText: name })).toBeVisible();
  await expect(page.getByText('画布已就绪', { exact: false })).toBeVisible();
  await page.screenshot({
    path: '.local/e2e/' + (process.env['E2E_MODE'] === 'dev' ? 'dev' : 'production') + '.png',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
