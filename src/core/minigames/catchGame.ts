import type { CatchMinigameDef } from '../content/types';
import type { Rng } from '../util/rng';
import type { MoveInput } from '../world/world';
import type { Minigame, MinigameStatus } from './minigame';

/** Логический размер поля мини-игры; рендер масштабирует его сам. */
export const CATCH_FIELD = { width: 160, height: 120 } as const;
export const CATCH_BASKET = { width: 24, height: 8, y: CATCH_FIELD.height - 10, speed: 120 } as const;
export const CATCH_ITEM_SIZE = 8;

export interface CatchItem {
  id: number;
  x: number;
  y: number;
  kind: 'good' | 'hazard';
}

/** «Лови хорошее, уворачивайся от плохого»: набрать targetScore до конца таймера. */
export class CatchGame implements Minigame {
  readonly type = 'catch';
  status: MinigameStatus = 'playing';
  score = 0;
  misses = 0;
  timeLeftMs: number;
  basketX: number = CATCH_FIELD.width / 2;
  items: CatchItem[] = [];

  private spawnTimerMs = 0;
  private nextId = 1;

  constructor(
    readonly def: CatchMinigameDef,
    private readonly rng: Rng,
  ) {
    this.timeLeftMs = def.durationMs;
  }

  update(dtMs: number, input: MoveInput): void {
    if (this.status !== 'playing') return;
    const dt = dtMs / 1000;
    const half = CATCH_BASKET.width / 2;
    const axis = Math.max(-1, Math.min(1, input.x));
    this.basketX = Math.max(half, Math.min(CATCH_FIELD.width - half, this.basketX + axis * CATCH_BASKET.speed * dt));

    this.spawnTimerMs += dtMs;
    while (this.spawnTimerMs >= this.def.spawnIntervalMs) {
      this.spawnTimerMs -= this.def.spawnIntervalMs;
      this.spawn();
    }

    const remaining: CatchItem[] = [];
    for (const item of this.items) {
      item.y += this.def.fallSpeed * dt;
      const caught =
        item.y + CATCH_ITEM_SIZE / 2 >= CATCH_BASKET.y &&
        item.y - CATCH_ITEM_SIZE / 2 <= CATCH_BASKET.y + CATCH_BASKET.height &&
        Math.abs(item.x - this.basketX) <= half + CATCH_ITEM_SIZE / 2;
      if (caught) {
        if (item.kind === 'good') this.score += 1;
        else this.misses += 1;
      } else if (item.y < CATCH_FIELD.height + CATCH_ITEM_SIZE) {
        remaining.push(item);
      }
    }
    this.items = remaining;
    this.timeLeftMs = Math.max(0, this.timeLeftMs - dtMs);

    if (this.score >= this.def.targetScore) this.status = 'won';
    else if (this.misses >= this.def.maxMisses || this.timeLeftMs === 0) this.status = 'lost';
  }

  private spawn(): void {
    const margin = CATCH_ITEM_SIZE;
    this.items.push({
      id: this.nextId++,
      x: margin + this.rng() * (CATCH_FIELD.width - margin * 2),
      y: -CATCH_ITEM_SIZE,
      kind: this.rng() < this.def.hazardChance ? 'hazard' : 'good',
    });
  }
}
