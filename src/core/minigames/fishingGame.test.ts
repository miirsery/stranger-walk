import { describe, expect, it } from 'vitest';
import type { FishingMinigameDef } from '../content/types';
import { createRng } from '../util/rng';
import { FISHING_FIELD, FishingGame } from './fishingGame';
import { createMinigame } from './minigame';

const def: FishingMinigameDef = {
  id: 'test',
  type: 'fishing',
  name: 'Тест',
  instructions: '',
  durationMs: 10_000,
  reelSpeed: 70,
  gravity: 40,
  fishSpeed: 45,
  fishTurnChance: 0.6,
  catchRate: 16,
  escapeRate: 9,
  music: 'none',
  rewardCards: [],
};

/** Простой бот: держит поплавок на уровне рыбы. */
const chase = (game: FishingGame): number => (game.fishY < game.bobberY ? -1 : 1);

describe('FishingGame', () => {
  it('создаётся фабрикой по типу мини-игры', () => {
    const game = createMinigame(def, createRng(1));
    expect(game).toBeInstanceOf(FishingGame);
    expect(game.status).toBe('playing');
  });

  it('поплавок не выходит за границы поля', () => {
    const game = new FishingGame(def, createRng(1));
    for (let i = 0; i < 300; i++) game.update(16, { x: 0, y: -1 });
    expect(game.bobberY).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < 300; i++) game.update(16, { x: 0, y: 1 });
    expect(game.bobberY).toBeLessThanOrEqual(FISHING_FIELD.height);
  });

  it('победа при заполнении шкалы поимки', () => {
    const game = new FishingGame(def, createRng(3));
    for (let i = 0; i < 5000 && game.status === 'playing'; i++) game.update(16, { x: 0, y: chase(game) });
    expect(game.status).toBe('won');
    expect(game.progress).toBe(100);
  });

  it('поражение по истечении времени; после конца игра не обновляется', () => {
    const game = new FishingGame({ ...def, durationMs: 100 }, createRng(1));
    for (let i = 0; i < 10; i++) game.update(16, { x: 0, y: 1 });
    expect(game.status).toBe('lost');
    const bobberY = game.bobberY;
    game.update(16, { x: 0, y: -1 });
    expect(game.bobberY).toBe(bobberY);
  });
});
