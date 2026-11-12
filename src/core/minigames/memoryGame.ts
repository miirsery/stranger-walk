import type { CardId, MemoryMinigameDef } from '../content/types';
import type { Rng } from '../util/rng';
import { shuffle } from '../util/rng';
import type { Minigame, MinigameStatus } from './minigame';

export interface MemoryTile {
  cardId: CardId;
  state: 'hidden' | 'open' | 'matched';
}

/** «Найди пару»: открывай по две плитки; ошибок — не больше `maxMistakes`. */
export class MemoryGame implements Minigame {
  readonly type = 'memory';
  status: MinigameStatus = 'playing';
  mistakes = 0;
  matchedPairs = 0;
  readonly tiles: MemoryTile[];

  /** Несовпавшая пара, которая пока показана игроку. */
  private pending: [number, number] | null = null;
  private hideTimerMs = 0;

  constructor(
    readonly def: MemoryMinigameDef,
    rng: Rng,
  ) {
    this.tiles = shuffle([...def.cards, ...def.cards], rng).map((cardId) => ({ cardId, state: 'hidden' }));
  }

  get totalPairs(): number {
    return this.def.cards.length;
  }

  /** Открывает плитку. Возвращает false, если ход сейчас невозможен. */
  flip(index: number): boolean {
    const tile = this.tiles[index];
    if (this.status !== 'playing' || this.pending || !tile || tile.state !== 'hidden') return false;
    const openIndex = this.tiles.findIndex((candidate) => candidate.state === 'open');
    tile.state = 'open';
    const other = this.tiles[openIndex];
    if (!other) return true;

    if (other.cardId === tile.cardId) {
      other.state = 'matched';
      tile.state = 'matched';
      this.matchedPairs += 1;
      if (this.matchedPairs === this.totalPairs) this.status = 'won';
    } else {
      this.mistakes += 1;
      this.pending = [openIndex, index];
      this.hideTimerMs = this.def.revealMs;
    }
    return true;
  }

  /** Ввод движения этой игре не нужен: плитки открываются через `flip`. */
  update(dtMs: number): void {
    if (this.status !== 'playing' || !this.pending) return;
    this.hideTimerMs -= dtMs;
    if (this.hideTimerMs > 0) return;
    for (const index of this.pending) {
      const tile = this.tiles[index];
      if (tile) tile.state = 'hidden';
    }
    this.pending = null;
    // Поражение объявляем после того, как игрок увидел последнюю ошибку.
    if (this.mistakes >= this.def.maxMistakes) this.status = 'lost';
  }
}
