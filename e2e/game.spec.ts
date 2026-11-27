import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    // Доступен только в dev-сборке (см. useGame.ts) — на нём и держится весь vite dev,
    // против которого выполняются эти тесты.
    __session: {
      world: { player: { x: number; y: number }; loadLevel(id: string): void };
      mode: { kind: string };
      quests: { start(questId: string): boolean };
      update(dtMs: number, input: { x: number; y: number }): void;
      cheatTeleport(levelId: string): void;
      cheatWinBattle(): void;
      cheatWinMinigame(): void;
    };
  }
}

/** Главное меню → слот сохранения → колода → мир. Слот пуст в каждом новом тесте Playwright. */
const startNewGame = async (page: Page): Promise<void> => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Играть' }).click();
  await page.getByRole('link', { name: 'Начать игру' }).first().click();
  await page.getByRole('button', { name: 'Разведчик' }).click();
  await page.getByRole('button', { name: 'Глава 1. Тихие луга' }).click();
};

/** Ставит игрока в клетку уровня и подталкивает мир пересчитать позицию (как `place()` в юнит-тестах). */
const placePlayer = (page: Page, tile: { x: number; y: number }): Promise<void> =>
  page.evaluate(({ x, y }) => {
    const TILE_SIZE = 16;
    window.__session.world.player.x = (x + 0.5) * TILE_SIZE;
    window.__session.world.player.y = (y + 0.5) * TILE_SIZE;
    window.__session.update(16, { x: 0, y: 0 });
  }, tile);

test.beforeEach(async ({ page }) => {
  // Чистый контекст Playwright без сохранения — в меню всегда пустые слоты.
  await page.goto('/');
});

test('главное меню предлагает начать игру', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Stranger Walk' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Играть' })).toBeVisible();
});

test('новая игра идёт через выбор слота и колоды, показывает мир и вступительную сцену', async ({ page }) => {
  await page.getByRole('link', { name: 'Играть' }).click();
  await expect(page.getByRole('heading', { name: 'Сохранения' })).toBeVisible();

  await page.getByRole('link', { name: 'Начать игру' }).first().click();
  await expect(page.getByRole('heading', { name: 'Выбери колоду' })).toBeVisible();
  await page.getByRole('button', { name: 'Разведчик' }).click();

  const scene = page.getByRole('button', { name: 'Глава 1. Тихие луга' });
  await expect(scene).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();

  await scene.click();
  await expect(scene).toBeHidden();
});

test('персонаж двигается по миру клавиатурой', async ({ page }) => {
  await startNewGame(page);

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
  await startNewGame(page);

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
  await startNewGame(page);

  await page.keyboard.press('Escape');
  const pause = page.getByRole('dialog', { name: 'Пауза' });
  await expect(pause).toBeVisible();

  await page.getByRole('button', { name: 'Продолжить' }).click();
  await expect(pause).toBeHidden();
});

test('карточный бой: диалог с боссом начинает бой, мулиган, ход и победа возвращают в мир', async ({ page }) => {
  await startNewGame(page);

  // Телепорт сразу к Хранителю Колоды — без похода через всю цепочку квестов и порталов.
  await page.evaluate(() => window.__session.cheatTeleport('castle'));
  await placePlayer(page, { x: 10, y: 2 });
  await page.keyboard.press('KeyE');

  // Диалог перед боем — несколько реплик подряд той же кнопкой действия.
  const mulligan = page.getByRole('dialog', { name: 'Стартовая рука' });
  for (let i = 0; i < 6 && !(await mulligan.isVisible()); i++) {
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(100);
  }
  await expect(mulligan).toBeVisible();

  // Оставляем стартовую руку как есть — мулиган не предмет этого теста.
  await mulligan.getByRole('button', { name: /Оставить руку|Заменить/ }).click();
  await expect(mulligan).toBeHidden();

  const battle = page.getByLabel('Карточный бой');
  await expect(battle).toBeVisible();
  await expect(page.getByLabel('Рука').locator('button')).not.toHaveCount(0);

  // Реальный ход игрока: конец хода запускает автоматический ход противника (таймер в BattleOverlay).
  const endTurn = page.getByRole('button', { name: /Конец хода/ });
  await endTurn.click();
  await expect(page.getByRole('button', { name: 'Конец хода' })).toBeVisible({ timeout: 15_000 });

  // Правила боя дотошно проверены юнит-тестами движка — e2e достаточно довести реальный UI до победы.
  await page.evaluate(() => window.__session.cheatWinBattle());

  const result = page.getByRole('dialog', { name: 'Итог боя' });
  await expect(result).toBeVisible();
  await expect(result.getByText('Победа!')).toBeVisible();
  await result.getByRole('button', { name: 'Продолжить' }).click();

  // Хранитель Колоды даёт выбор карты, затем прощальную реплику — дочитываем до возврата в мир.
  const reward = page.getByRole('dialog', { name: 'Награда за победу' });
  const rewardShown = await reward
    .waitFor({ state: 'visible', timeout: 3_000 })
    .then(() => true)
    .catch(() => false);
  if (rewardShown) await reward.locator('button').first().click();
  for (let i = 0; i < 10 && (await page.evaluate(() => window.__session.mode.kind)) !== 'world'; i++) {
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(100);
  }

  await expect(battle).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__session.mode.kind)).toBe('world');
});

test('мини-игра: разговор с фермером открывает мини-игру, победа выдаёт награду', async ({ page }) => {
  await startNewGame(page);
  // Фермер предлагает мини-игру, только пока активен первый квест — обычно его даёт старейшина.
  await page.evaluate(() => window.__session.quests.start('first_steps'));
  await placePlayer(page, { x: 19, y: 14 });
  await page.keyboard.press('KeyE');

  const intro = page.getByRole('dialog', { name: 'Сбор урожая' });
  for (let i = 0; i < 6 && !(await intro.isVisible()); i++) {
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(100);
  }
  await expect(intro).toBeVisible();
  await intro.getByRole('button', { name: 'Начать' }).click();
  await expect(intro).toBeHidden();

  // Сам процесс ловли яблок — логика движка (catchGame.test.ts), здесь важен переход экранов.
  await page.evaluate(() => window.__session.cheatWinMinigame());

  const finished = page.getByRole('dialog', { name: 'Итог мини-игры' });
  await expect(finished).toBeVisible();
  await expect(finished.getByText('Победа!')).toBeVisible();
  await finished.getByRole('button', { name: 'Продолжить' }).click();

  // За первую победу в «Сборе урожая» дают карту на выбор.
  const reward = page.getByRole('dialog', { name: 'Награда за победу' });
  await expect(reward).toBeVisible();
  await reward.locator('button').first().click();
  await expect(reward).toBeHidden();
});
