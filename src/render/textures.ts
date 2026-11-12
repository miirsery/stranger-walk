import type * as Phaser from 'phaser';
import type { SettingDef, SpriteLook, TileDef } from '@core/content/types';
import type { Facing } from '@core/world/world';
import { TILE_SIZE } from '@core/world/tileMap';

/**
 * Процедурные текстуры-заглушки. Пока художник не нарисовал спрайты, тайлы и персонажи
 * генерируются из цветов, описанных в контенте. Замена на настоящие атласы — только в этом файле.
 */

const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;
const INK = '#14121f';

type Rect = readonly [x: number, y: number, w: number, h: number];

const fill = (ctx: CanvasRenderingContext2D, ox: number, color: string, rects: readonly Rect[]): void => {
  ctx.fillStyle = color;
  for (const [x, y, w, h] of rects) ctx.fillRect(ox + x, y, w, h);
};

const PATTERNS: Record<TileDef['pattern'], readonly Rect[]> = {
  flat: [],
  speckle: [[2, 3, 1, 1], [7, 1, 1, 1], [12, 5, 1, 1], [4, 10, 1, 1], [10, 12, 1, 1], [14, 9, 1, 1]],
  bricks: [[0, 7, 16, 1], [0, 15, 16, 1], [7, 0, 1, 7], [3, 8, 1, 7], [11, 8, 1, 7]],
  waves: [[1, 3, 4, 1], [9, 5, 4, 1], [4, 10, 4, 1], [11, 12, 4, 1]],
  planks: [[0, 0, 1, 16], [5, 0, 1, 16], [10, 0, 1, 16], [15, 0, 1, 16], [0, 3, 16, 1], [0, 12, 16, 1]],
  grid: [[15, 0, 1, 16], [0, 15, 16, 1]],
  stars: [[3, 2, 1, 1], [11, 4, 1, 1], [6, 9, 1, 1], [13, 13, 1, 1], [1, 12, 1, 1]],
  door: [[2, 2, 12, 1], [2, 13, 12, 1], [2, 2, 1, 12], [13, 2, 1, 12], [6, 6, 4, 4]],
};

export const tilesetKey = (settingId: string): string => `tiles-${settingId}`;

/** Тайлсет сеттинга: тайлы в ряд, в порядке `Object.keys(setting.tiles)`. */
export const ensureTilesetTexture = (scene: Phaser.Scene, setting: SettingDef): string => {
  const key = tilesetKey(setting.id);
  if (scene.textures.exists(key)) return key;
  const tiles = Object.values(setting.tiles);
  const texture = scene.textures.createCanvas(key, tiles.length * TILE_SIZE, TILE_SIZE);
  if (!texture) throw new Error(`Не удалось создать текстуру ${key}`);
  const ctx = texture.getContext();
  tiles.forEach((tile, index) => {
    const ox = index * TILE_SIZE;
    fill(ctx, ox, css(tile.color), [[0, 0, TILE_SIZE, TILE_SIZE]]);
    fill(ctx, ox, css(tile.accent), PATTERNS[tile.pattern]);
  });
  texture.refresh();
  return key;
};

const FACINGS: readonly Facing[] = ['down', 'up', 'left', 'right'];

/** Номер кадра в текстуре персонажа: 4 направления × 2 кадра шага. */
export const characterFrame = (facing: Facing, step: 0 | 1): number => FACINGS.indexOf(facing) * 2 + step;

export const ensureCharacterTexture = (scene: Phaser.Scene, key: string, look: SpriteLook): string => {
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, TILE_SIZE * FACINGS.length * 2, TILE_SIZE);
  if (!texture) throw new Error(`Не удалось создать текстуру ${key}`);
  const ctx = texture.getContext();
  const hat = css(look.hat);
  const skin = css(look.skin);
  const body = css(look.body);

  FACINGS.forEach((facing, facingIndex) => {
    for (const step of [0, 1] as const) {
      const frame = facingIndex * 2 + step;
      const ox = frame * TILE_SIZE;
      fill(ctx, ox, INK, [[3, 0, 10, 9], [2, 7, 12, 7]]);
      fill(ctx, ox, skin, [[4, 3, 8, 5], [2, 9, 1, 3], [13, 9, 1, 3]]);
      fill(ctx, ox, hat, facing === 'up' ? [[4, 1, 8, 6]] : [[4, 1, 8, 3]]);
      fill(ctx, ox, body, [[3, 8, 10, 5]]);
      if (facing === 'down') fill(ctx, ox, INK, [[6, 5, 1, 2], [9, 5, 1, 2]]);
      if (facing === 'left') fill(ctx, ox, INK, [[5, 5, 1, 2]]);
      if (facing === 'right') fill(ctx, ox, INK, [[10, 5, 1, 2]]);
      fill(ctx, ox, INK, step === 0 ? [[5, 13, 2, 3], [9, 13, 2, 3]] : [[5, 13, 2, 3], [9, 13, 2, 1]]);
      texture.add(frame, 0, ox, 0, TILE_SIZE, TILE_SIZE);
    }
  });
  texture.refresh();
  return key;
};

/** Маленькая однокадровая текстура из прямоугольников — для предметов мини-игр и значков. */
export const ensureIconTexture = (
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  layers: readonly { color: number; rects: readonly Rect[] }[],
): string => {
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) throw new Error(`Не удалось создать текстуру ${key}`);
  const ctx = texture.getContext();
  for (const layer of layers) fill(ctx, 0, css(layer.color), layer.rects);
  texture.refresh();
  return key;
};
