import { describe, expect, it } from 'vitest';
import type { RhythmMinigameDef } from '../content/types';
import { createRng } from '../util/rng';
import { createMinigame } from './minigame';
import { RhythmGame } from './rhythmGame';

const def: RhythmMinigameDef = {
  id: 'test',
  type: 'rhythm',
  name: 'Тест',
  instructions: '',
  bpm: 120,
  pattern: 'X - - X - - X - X - - X - - X -',
  hitWindowMs: 60,
  maxMisses: 2,
  music: 'none',
  rewardCards: [],
};

/** Прокручивает время до нужной отметки мелкими шагами (как реальный игровой цикл). */
const advanceTo = (game: RhythmGame, targetMs: number): void => {
  while (game.elapsedMs < targetMs && game.status === 'playing') game.update(16);
};

describe('RhythmGame', () => {
  it('создаётся фабрикой по типу мини-игры', () => {
    const game = createMinigame(def, createRng(1));
    expect(game).toBeInstanceOf(RhythmGame);
    expect(game.status).toBe('playing');
  });

  it('победа при точных нажатиях на все ноты', () => {
    const game = new RhythmGame(def);
    expect(game.notes.length).toBe(6);
    for (const note of game.notes) {
      advanceTo(game, note.timeMs);
      game.hit();
    }
    advanceTo(game, game.durationMs + def.hitWindowMs + 1);
    expect(game.status).toBe('won');
    expect(game.misses).toBe(0);
    expect(game.hits).toBe(6);
  });

  it('пропущенные ноты засчитываются промахом сами по себе, поражение — как только их больше maxMisses', () => {
    const game = new RhythmGame(def);
    advanceTo(game, game.durationMs + def.hitWindowMs + 1);
    expect(game.status).toBe('lost');
    // Игра останавливается сразу при превышении лимита, а не доигрывает до конца — промахов ровно maxMisses+1.
    expect(game.misses).toBe(def.maxMisses + 1);
  });

  it('нажатие мимо ноты тоже считается промахом', () => {
    const game = new RhythmGame(def);
    // Между первой (0мс) и второй (375мс) нотой — вне окна обеих.
    advanceTo(game, 250);
    const before = game.misses;
    game.hit();
    expect(game.misses).toBe(before + 1);
  });

  it('поражение, как только промахов становится больше maxMisses; после — игра не обновляется', () => {
    const game = new RhythmGame(def);
    advanceTo(game, 250);
    while (game.status === 'playing') game.hit();
    expect(game.status).toBe('lost');
    const misses = game.misses;
    game.update(16);
    expect(game.misses).toBe(misses);
  });
});
