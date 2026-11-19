import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    // Доступен только в dev-сборке (см. useGame.ts) — на нём и держится весь vite dev,
    // против которого выполняются эти тесты.
    __session: { world: { player: { x: number; y: number } } };
  }
}

test.beforeEach(async ({ page }) => {
  // Чистый контекст Playwright без сохранения — в меню всегда кнопка «Играть».
  await page.goto('/');
});

test('главное меню предлагает начать игру', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Stranger Walk' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Играть' })).toBeVisible();
});

test('новая игра загружает мир и показывает вступительную сцену', async ({ page }) => {
  await page.getByRole('link', { name: 'Играть' }).click();

  const scene = page.getByRole('button', { name: 'Глава 1. Тихие луга' });
  await expect(scene).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();

  await scene.click();
  await expect(scene).toBeHidden();
});

test('персонаж двигается по миру клавиатурой', async ({ page }) => {
  await page.getByRole('link', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Глава 1. Тихие луга' }).click();

  const position = (): Promise<{ x: number; y: number }> =>
    page.evaluate(() => {
      const { x, y } = window.__session.world.player;
      return { x, y };
    });

  const before = await position();
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyD');
  const after = await position();

  expect(after.x).not.toBeCloseTo(before.x, 1);
});

test('журнал и колода открываются и закрываются', async ({ page }) => {
  await page.getByRole('link', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Глава 1. Тихие луга' }).click();

  await page.keyboard.press('KeyJ');
  const journal = page.getByRole('dialog', { name: 'Журнал' });
  await expect(journal).toBeVisible();
  await page.keyboard.press('KeyJ');
  await expect(journal).toBeHidden();

  await page.keyboard.press('KeyC');
  const deck = page.getByRole('dialog', { name: 'Колода' });
  await expect(deck).toBeVisible();
  await page.keyboard.press('KeyC');
  await expect(deck).toBeHidden();
});

test('пауза останавливает и возвращает в игру', async ({ page }) => {
  await page.getByRole('link', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'Глава 1. Тихие луга' }).click();

  await page.keyboard.press('Escape');
  const pause = page.getByRole('dialog', { name: 'Пауза' });
  await expect(pause).toBeVisible();

  await page.getByRole('button', { name: 'Продолжить' }).click();
  await expect(pause).toBeHidden();
});
