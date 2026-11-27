import type { SlideMinigameDef } from '../content/types';
import type { Rng } from '../util/rng';
import type { Minigame, MinigameStatus } from './minigame';

/** «Пятнашки»: собери числа 1..n-1 по порядку, пустая клетка — последняя в ряду. */
export class SlideGame implements Minigame {
  readonly type = 'slide';
  status: MinigameStatus = 'playing';
  moves = 0;
  readonly size: number;
  /** Плитки по строкам; 0 — пустая клетка. */
  tiles: number[];

  constructor(
    readonly def: SlideMinigameDef,
    rng: Rng,
  ) {
    this.size = def.size;
    const total = this.size * this.size;
    this.tiles = Array.from({ length: total }, (_, index) => (index + 1) % total);
    this.shuffle(rng);
  }

  get blankIndex(): number {
    return this.tiles.indexOf(0);
  }

  get solved(): boolean {
    const total = this.size * this.size;
    return this.tiles.every((value, index) => value === (index + 1) % total);
  }

  /** Передвигает плитку на `index` на пустую клетку, если они соседствуют. Возвращает false, если ход невозможен. */
  move(index: number): boolean {
    if (this.status !== 'playing') return false;
    if (!this.neighborsOf(this.blankIndex).includes(index)) return false;
    this.swap(this.blankIndex, index);
    this.moves += 1;
    if (this.solved) this.status = 'won';
    else if (this.moves >= this.def.maxMoves) this.status = 'lost';
    return true;
  }

  /** Ввод движения этой игре не нужен: плитки двигаются через `move`. */
  update(): void {}

  private neighborsOf(index: number): number[] {
    const x = index % this.size;
    const y = Math.floor(index / this.size);
    const result: number[] = [];
    if (x > 0) result.push(index - 1);
    if (x < this.size - 1) result.push(index + 1);
    if (y > 0) result.push(index - this.size);
    if (y < this.size - 1) result.push(index + this.size);
    return result;
  }

  private swap(a: number, b: number): void {
    const first = this.tiles[a];
    const second = this.tiles[b];
    if (first === undefined || second === undefined) return;
    this.tiles[a] = second;
    this.tiles[b] = first;
  }

  /** Случайные ходы от решённого состояния — в отличие от произвольной перестановки, всегда разрешимы. */
  private shuffle(rng: Rng): void {
    for (let step = 0; step < this.size * this.size * 20; step += 1) {
      const neighbors = this.neighborsOf(this.blankIndex);
      const pick = neighbors[Math.floor(rng() * neighbors.length)];
      if (pick !== undefined) this.swap(this.blankIndex, pick);
    }
  }
}
