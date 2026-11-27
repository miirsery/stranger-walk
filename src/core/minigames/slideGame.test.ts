import { describe, expect, it } from 'vitest';
import type { SlideMinigameDef } from '../content/types';
import { createRng } from '../util/rng';
import { createMinigame } from './minigame';
import { SlideGame } from './slideGame';

const def: SlideMinigameDef = {
  id: 'test',
  type: 'slide',
  name: 'Тест',
  instructions: '',
  size: 3,
  maxMoves: 1,
  music: 'none',
  rewardCards: [],
};

describe('SlideGame', () => {
  it('создаётся фабрикой, раскладывает все плитки без повторов и начинает не решённой', () => {
    const game = createMinigame(def, createRng(1));
    if (!(game instanceof SlideGame)) throw new Error('ожидался SlideGame');
    expect(game.tiles.slice().sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(game.solved).toBe(false);
    expect(game.status).toBe('playing');
  });

  it('ход возможен только на клетку, соседнюю с пустой', () => {
    const game = new SlideGame({ ...def, maxMoves: 10 }, createRng(1));
    const blank = game.blankIndex;
    const notNeighbor = game.tiles.findIndex((_, index) => {
      if (index === blank) return false;
      const dx = Math.abs((index % game.size) - (blank % game.size));
      const dy = Math.abs(Math.floor(index / game.size) - Math.floor(blank / game.size));
      return dx + dy !== 1;
    });
    expect(game.move(notNeighbor)).toBe(false);
    expect(game.moves).toBe(0);
  });

  it('последний ход, собирающий поле по порядку, — победа', () => {
    const game = new SlideGame({ ...def, maxMoves: 10 }, createRng(1));
    const total = game.size * game.size;
    const last = total - 1;
    game.tiles = Array.from({ length: total }, (_, index) => (index + 1) % total);
    [game.tiles[last - 1], game.tiles[last]] = [game.tiles[last] as number, game.tiles[last - 1] as number];

    expect(game.move(last)).toBe(true);
    expect(game.moves).toBe(1);
    expect(game.solved).toBe(true);
    expect(game.status).toBe('won');
  });

  it('поражение, когда ходы кончились, а поле не собрано', () => {
    const game = new SlideGame({ ...def, maxMoves: 1 }, createRng(1));
    const blank = game.blankIndex;
    // Клетка слева от пустой (если пустая не в левом столбце) — заведомо соседняя.
    const neighbor = blank % game.size > 0 ? blank - 1 : blank + 1;
    expect(game.move(neighbor)).toBe(true);
    expect(game.moves).toBe(1);
    // Собрать 3×3 одним ходом из случайного расклада практически невозможно — проверяем именно это.
    expect(game.status).toBe('lost');
  });
});
