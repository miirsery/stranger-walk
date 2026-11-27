import type { RhythmMinigameDef } from '../content/types';
import type { Minigame, MinigameStatus } from './minigame';

interface RhythmNote {
  timeMs: number;
  resolved: boolean;
  hit: boolean;
}

/** «Ритм»: жми «действие» (та же кнопка, что и для диалогов) точно в момент ноты. */
export class RhythmGame implements Minigame {
  readonly type = 'rhythm';
  status: MinigameStatus = 'playing';
  misses = 0;
  hits = 0;
  elapsedMs = 0;
  readonly notes: RhythmNote[];
  readonly durationMs: number;

  constructor(readonly def: RhythmMinigameDef) {
    const stepMs = 60_000 / def.bpm / 4;
    const tokens = def.pattern.split(/\s+/);
    this.notes = tokens
      .map((token, index) => ({ token, timeMs: index * stepMs }))
      .filter((entry) => entry.token === 'X')
      .map((entry) => ({ timeMs: entry.timeMs, resolved: false, hit: false }));
    this.durationMs = tokens.length * stepMs;
  }

  /** Ход времени без ввода движения: ноты, не нажатые вовремя, засчитываются как пропуск. */
  update(dtMs: number): void {
    if (this.status !== 'playing') return;
    this.elapsedMs += dtMs;
    for (const note of this.notes) {
      if (!note.resolved && this.elapsedMs > note.timeMs + this.def.hitWindowMs) {
        note.resolved = true;
        this.misses += 1;
      }
    }
    if (this.misses > this.def.maxMisses) {
      this.status = 'lost';
    } else if (this.elapsedMs >= this.durationMs + this.def.hitWindowMs) {
      this.status = this.misses <= this.def.maxMisses ? 'won' : 'lost';
    }
  }

  /** Нажатие кнопки «действие»: засчитывает ближайшую ненажатую ноту в пределах окна, иначе — промах. */
  hit(): void {
    if (this.status !== 'playing') return;
    let best: RhythmNote | null = null;
    let bestDelta = Infinity;
    for (const note of this.notes) {
      if (note.resolved) continue;
      const delta = Math.abs(this.elapsedMs - note.timeMs);
      if (delta <= this.def.hitWindowMs && delta < bestDelta) {
        best = note;
        bestDelta = delta;
      }
    }
    if (best) {
      best.resolved = true;
      best.hit = true;
      this.hits += 1;
    } else {
      this.misses += 1;
      if (this.misses > this.def.maxMisses) this.status = 'lost';
    }
  }
}
