import { describe, expect, it } from 'vitest';
import type { MemoryMinigameDef } from '../content/types';
import { createRng } from '../util/rng';
import { MemoryGame } from './memoryGame';
import { createMinigame } from './minigame';

const def: MemoryMinigameDef = {
  id: 'test',
  type: 'memory',
  name: 'Тест',
  instructions: '',
  cards: ['a', 'b', 'c'],
  maxMistakes: 2,
  revealMs: 500,
  music: 'none',
  rewardCards: [],
};

const create = (): MemoryGame => new MemoryGame(def, createRng(11));

/** Индексы двух плиток с одной картой. */
const pairOf = (game: MemoryGame, cardId: string): [number, number] => {
  const indexes = game.tiles.flatMap((tile, index) => (tile.cardId === cardId ? [index] : []));
  return [indexes[0] ?? -1, indexes[1] ?? -1];
};

describe('MemoryGame', () => {
  it('создаётся фабрикой и раскладывает по две плитки каждой карты', () => {
    const game = createMinigame(def, createRng(1));
    expect(game).toBeInstanceOf(MemoryGame);
    const tiles = create().tiles;
    expect(tiles).toHaveLength(6);
    expect(tiles.every((tile) => tile.state === 'hidden')).toBe(true);
    expect(tiles.map((tile) => tile.cardId).sort()).toEqual(['a', 'a', 'b', 'b', 'c', 'c']);
  });

  it('совпавшая пара остаётся открытой; все пары — победа', () => {
    const game = create();
    for (const cardId of def.cards) {
      const [first, second] = pairOf(game, cardId);
      expect(game.flip(first)).toBe(true);
      expect(game.flip(second)).toBe(true);
    }
    expect(game.matchedPairs).toBe(3);
    expect(game.mistakes).toBe(0);
    expect(game.status).toBe('won');
    expect(game.flip(0)).toBe(false);
  });

  it('несовпавшая пара считается ошибкой и закрывается после паузы', () => {
    const game = create();
    const [a] = pairOf(game, 'a');
    const [b] = pairOf(game, 'b');
    const [c] = pairOf(game, 'c');
    game.flip(a);
    game.flip(b);
    expect(game.mistakes).toBe(1);
    expect(game.flip(c)).toBe(false);
    game.update(499);
    expect(game.tiles[a]?.state).toBe('open');
    game.update(1);
    expect(game.tiles[a]?.state).toBe('hidden');
    expect(game.tiles[b]?.state).toBe('hidden');
    expect(game.flip(c)).toBe(true);
  });

  it('нельзя открыть ту же или уже найденную плитку', () => {
    const game = create();
    const [first, second] = pairOf(game, 'a');
    game.flip(first);
    expect(game.flip(first)).toBe(false);
    game.flip(second);
    expect(game.flip(first)).toBe(false);
    expect(game.flip(99)).toBe(false);
  });

  it('поражение после лимита ошибок', () => {
    const game = create();
    const [a] = pairOf(game, 'a');
    const [b] = pairOf(game, 'b');
    for (let i = 0; i < 2; i++) {
      game.flip(a);
      game.flip(b);
      expect(game.status).toBe('playing');
      game.update(500);
    }
    expect(game.status).toBe('lost');
  });
});
