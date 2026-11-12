import { describe, expect, it } from 'vitest';
import type { CatchMinigameDef } from '../content/types';
import { createRng } from '../util/rng';
import { CATCH_BASKET, CATCH_FIELD, CatchGame } from './catchGame';
import { createMinigame } from './minigame';

const def: CatchMinigameDef = {
  id: 'test',
  type: 'catch',
  name: 'Тест',
  instructions: '',
  durationMs: 10_000,
  targetScore: 3,
  spawnIntervalMs: 500,
  fallSpeed: 100,
  hazardChance: 0,
  maxMisses: 2,
  music: 'none',
  rewardCards: [],
};

/** Простой бот: ведёт корзину к ближайшему к земле предмету нужного вида. */
const chase = (game: CatchGame, kind: 'good' | 'hazard'): number => {
  const target = game.items.filter((item) => item.kind === kind).sort((a, b) => b.y - a.y)[0];
  if (!target) return 0;
  const delta = target.x - game.basketX;
  return Math.abs(delta) < 2 ? 0 : Math.sign(delta);
};

describe('CatchGame', () => {
  it('создаётся фабрикой по типу мини-игры', () => {
    const game = createMinigame(def, createRng(1));
    expect(game).toBeInstanceOf(CatchGame);
    expect(game.status).toBe('playing');
  });

  it('корзина не выходит за границы поля', () => {
    const game = new CatchGame({ ...def, spawnIntervalMs: 1e9 }, createRng(1));
    for (let i = 0; i < 300; i++) game.update(16, { x: -1, y: 0 });
    expect(game.basketX).toBe(CATCH_BASKET.width / 2);
    for (let i = 0; i < 300; i++) game.update(16, { x: 1, y: 0 });
    expect(game.basketX).toBe(CATCH_FIELD.width - CATCH_BASKET.width / 2);
  });

  it('победа при наборе нужного счёта', () => {
    const game = new CatchGame(def, createRng(7));
    for (let i = 0; i < 2000 && game.status === 'playing'; i++) game.update(16, { x: chase(game, 'good'), y: 0 });
    expect(game.status).toBe('won');
    expect(game.score).toBe(3);
  });

  it('поражение, если поймано слишком много опасных предметов', () => {
    const game = new CatchGame({ ...def, hazardChance: 1 }, createRng(7));
    for (let i = 0; i < 2000 && game.status === 'playing'; i++) game.update(16, { x: chase(game, 'hazard'), y: 0 });
    expect(game.status).toBe('lost');
    expect(game.misses).toBe(2);
  });

  it('поражение по истечении времени; после конца игра не обновляется', () => {
    const game = new CatchGame({ ...def, spawnIntervalMs: 1e9, durationMs: 100 }, createRng(1));
    for (let i = 0; i < 10; i++) game.update(16, { x: 0, y: 0 });
    expect(game.status).toBe('lost');
    const basket = game.basketX;
    game.update(16, { x: 1, y: 0 });
    expect(game.basketX).toBe(basket);
  });
});
