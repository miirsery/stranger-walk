import type { FishingMinigameDef } from '../content/types';
import type { Rng } from '../util/rng';
import type { MoveInput } from '../world/world';
import type { Minigame, MinigameStatus } from './minigame';

/** Логический размер поля мини-игры; рендер масштабирует его сам. */
export const FISHING_FIELD = { width: 48, height: 120 } as const;
export const FISHING_BOBBER = { width: 22, height: 18 } as const;
export const FISHING_FISH_SIZE = 12;
export const FISHING_MAX_PROGRESS = 100;

/** «Рыбалка»: держи поплавок у рыбы — зажимай «вверх», отпускай, чтобы не вылететь за край. */
export class FishingGame implements Minigame {
  readonly type = 'fishing';
  status: MinigameStatus = 'playing';
  timeLeftMs: number;
  progress = 0;
  bobberY: number;
  fishY: number;

  private fishDir: 1 | -1 = 1;

  constructor(
    readonly def: FishingMinigameDef,
    private readonly rng: Rng,
  ) {
    this.timeLeftMs = def.durationMs;
    this.bobberY = FISHING_FIELD.height / 2;
    this.fishY = FISHING_FIELD.height / 2;
  }

  update(dtMs: number, input: MoveInput): void {
    if (this.status !== 'playing') return;
    const dt = dtMs / 1000;

    const bobberHalf = FISHING_BOBBER.height / 2;
    const bobberDelta = (input.y < -0.2 ? -this.def.reelSpeed : this.def.gravity) * dt;
    this.bobberY = Math.max(bobberHalf, Math.min(FISHING_FIELD.height - bobberHalf, this.bobberY + bobberDelta));

    if (this.rng() < this.def.fishTurnChance * dt) this.fishDir = this.fishDir === 1 ? -1 : 1;
    const fishHalf = FISHING_FISH_SIZE / 2;
    this.fishY += this.fishDir * this.def.fishSpeed * dt;
    if (this.fishY <= fishHalf) {
      this.fishY = fishHalf;
      this.fishDir = 1;
    } else if (this.fishY >= FISHING_FIELD.height - fishHalf) {
      this.fishY = FISHING_FIELD.height - fishHalf;
      this.fishDir = -1;
    }

    const caught = Math.abs(this.fishY - this.bobberY) <= bobberHalf + fishHalf;
    const progressDelta = (caught ? this.def.catchRate : -this.def.escapeRate) * dt;
    this.progress = Math.max(0, Math.min(FISHING_MAX_PROGRESS, this.progress + progressDelta));

    this.timeLeftMs = Math.max(0, this.timeLeftMs - dtMs);

    if (this.progress >= FISHING_MAX_PROGRESS) this.status = 'won';
    else if (this.timeLeftMs === 0) this.status = 'lost';
  }
}
