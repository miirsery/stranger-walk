import type { MinigameDef } from '../content/types';
import type { Rng } from '../util/rng';
import type { MoveInput } from '../world/world';
import { CatchGame } from './catchGame';
import { FishingGame } from './fishingGame';
import { MemoryGame } from './memoryGame';
import { RhythmGame } from './rhythmGame';
import { SlideGame } from './slideGame';

export type MinigameStatus = 'playing' | 'won' | 'lost';

/** Общий контракт мини-игр: сессия обновляет их и ждёт исхода, не зная деталей. */
export interface Minigame {
  readonly type: MinigameDef['type'];
  readonly def: MinigameDef;
  readonly status: MinigameStatus;
  update(dtMs: number, input: MoveInput): void;
}

/** Все реализованные мини-игры. Новая игра = новый класс + ветка здесь + сцена в рендере. */
export type AnyMinigame = CatchGame | MemoryGame | FishingGame | RhythmGame | SlideGame;

export const createMinigame = (def: MinigameDef, rng: Rng): AnyMinigame => {
  switch (def.type) {
    case 'catch':
      return new CatchGame(def, rng);
    case 'memory':
      return new MemoryGame(def, rng);
    case 'fishing':
      return new FishingGame(def, rng);
    case 'rhythm':
      return new RhythmGame(def);
    case 'slide':
      return new SlideGame(def, rng);
  }
};
