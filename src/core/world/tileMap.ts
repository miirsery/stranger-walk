import type { LevelDef, Point, SettingDef, TileDef } from '../content/types';

/** Размер тайла в пикселях мира. */
export const TILE_SIZE = 16;

export const tileCenter = (tile: Point): Point => ({
  x: (tile.x + 0.5) * TILE_SIZE,
  y: (tile.y + 0.5) * TILE_SIZE,
});

export const pixelToTile = (pixel: number): number => Math.floor(pixel / TILE_SIZE);

/** Карта уровня: расшифровывает символы `LevelDef.rows` через тайлы сеттинга. */
export class TileMap {
  readonly width: number;
  readonly height: number;
  /** Упорядоченный список символов тайлов — индекс используется рендером как номер кадра тайлсета. */
  readonly tileChars: string[];

  constructor(
    readonly level: LevelDef,
    readonly setting: SettingDef,
  ) {
    this.height = level.rows.length;
    this.width = level.rows[0]?.length ?? 0;
    this.tileChars = Object.keys(setting.tiles);
  }

  get pixelWidth(): number {
    return this.width * TILE_SIZE;
  }

  get pixelHeight(): number {
    return this.height * TILE_SIZE;
  }

  tileAt(tx: number, ty: number): TileDef | undefined {
    const char = this.level.rows[ty]?.[tx];
    return char === undefined ? undefined : this.setting.tiles[char];
  }

  /** Индекс тайла в `tileChars` или -1 за пределами карты. */
  tileIndexAt(tx: number, ty: number): number {
    const char = this.level.rows[ty]?.[tx];
    return char === undefined ? -1 : this.tileChars.indexOf(char);
  }

  /** Всё за границами карты считается стеной. */
  isSolid(tx: number, ty: number): boolean {
    return this.tileAt(tx, ty)?.solid ?? true;
  }
}
