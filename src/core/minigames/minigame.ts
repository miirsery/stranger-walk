import type { MinigameDef } from '../content/types';
import type { Rng } from '../util/rng';
import type { MoveInput } from '../world/world';
import { CatchGame } from './catchGame';
import { MemoryGame } from './memoryGame';

export type MinigameStatus = 'playing' | 'won' | 'lost';

/** Общий контракт мини-игр: сессия обновляет их и ждёт исхода, не зная деталей. */
export interface Minigame {
  readonly type: MinigameDef['type'];
  readonly def: MinigameDef;
  readonly status: MinigameStatus;
  update(dtMs: number, input: MoveInput): void;
}

/** Все реализованные мини-игры. Новая игра = новый класс + ветка здесь + сцена в рендере. */
export type AnyMinigame = CatchGame | MemoryGame;

export const createMinigame = (def: MinigameDef, rng: Rng): AnyMinigame => {
  switch (def.type) {
    case 'catch':
      return new CatchGame(def, rng);
    case 'memory':
      return new MemoryGame(def, rng);
  }
};
