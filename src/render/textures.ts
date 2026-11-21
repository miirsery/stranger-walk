import type * as Phaser from 'phaser';
import type { SettingDef, SpriteLook, TileDef } from '@core/content/types';
import type { Facing } from '@core/world/world';
import { TILE_SIZE } from '@core/world/tileMap';

/**
 * Тайлы и персонажи, для которых есть настоящий арт (`public/assets/characters`,
 * `public/assets/tiles`, в WebP для меньшего веса сборки), рисуются им; для остальных — старая процедурная заглушка
 * из цветов контента. Вся эта развилка — только в этом файле, остальной рендер не знает,
 * откуда взялась текстура.
 */

const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;
const INK = '#14121f';

type Rect = readonly [x: number, y: number, w: number, h: number];

const fill = (ctx: CanvasRenderingContext2D, ox: number, color: string, rects: readonly Rect[]): void => {
  ctx.fillStyle = color;
  for (const [x, y, w, h] of rects) ctx.fillRect(ox + x, y, w, h);
};

type ArtSource = HTMLImageElement | HTMLCanvasElement;

const isArtSource = (value: unknown): value is ArtSource =>
  value instanceof HTMLImageElement || value instanceof HTMLCanvasElement;

/** Уже загруженное (через `preloadArt`) изображение по ключу — или `null`, если его нет/не загрузилось. */
const getArtSource = (scene: Phaser.Scene, key: string): ArtSource | null => {
  if (!scene.textures.exists(key)) return null;
  const source = scene.textures.get(key).getSourceImage();
  return isArtSource(source) ? source : null;
};

const drawArt = (ctx: CanvasRenderingContext2D, source: ArtSource, ox: number, size: number): void => {
  ctx.drawImage(source, ox, 0, size, size);
};

/** Персонажи, для которых нарисован арт (`public/assets/characters/<id>.webp`). */
const CHARACTER_ART_IDS = [
  'player', 'elder', 'farmer', 'beekeeper', 'captain', 'engineer', 'trader', 'keeper', 'void_captain',
] as const;

const characterArtKey = (id: string): string => `art-char-${id}`;
const hasCharacterArt = (id: string): boolean => (CHARACTER_ART_IDS as readonly string[]).includes(id);

/** Тайлы, для которых нарисован арт (`public/assets/tiles/<сеттинг>_<слаг>.webp`). */
const TILE_ART_CHARS: Record<string, string[]> = {
  fields: ['.', ',', '=', '#', '~', 'F', 'D'],
  submarine: ['.', '#', 'o', '=', 'D'],
  castle: ['.', '=', '#', 'T', 'D'],
  space: ['.', '#', '*', 'D'],
};
/** Некоторые символы тайлов — не годные имена файлов, храним их арт под читаемым слагом. */
const TILE_SLUGS: Record<string, string> = { '.': 'dot', ',': 'comma', '=': 'eq', '#': 'hash', '~': 'tilde', '*': 'star' };
const tileSlug = (char: string): string => TILE_SLUGS[char] ?? char;
const tileArtKey = (settingId: string, char: string): string => `art-tile-${settingId}-${tileSlug(char)}`;
const hasTileArt = (settingId: string, char: string): boolean => (TILE_ART_CHARS[settingId] ?? []).includes(char);

/**
 * Ставит в очередь загрузки весь имеющийся арт персонажей и тайлов. Вызывать один раз
 * из `preload()` сцены — к моменту `create()` `getArtSource` уже найдёт готовые текстуры.
 */
export const preloadArt = (scene: Phaser.Scene): void => {
  const base: string = import.meta.env.BASE_URL;
  for (const id of CHARACTER_ART_IDS) scene.load.image(characterArtKey(id), `${base}assets/characters/${id}.webp`);
  for (const [settingId, chars] of Object.entries(TILE_ART_CHARS)) {
    for (const char of chars) scene.load.image(tileArtKey(settingId, char), `${base}assets/tiles/${settingId}_${tileSlug(char)}.webp`);
  }
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

/** Второй кадр для «живых» узоров: вода течёт, звёзды мерцают, огни и люки мигают. */
const ANIMATED_PATTERNS: Partial<Record<TileDef['pattern'], readonly Rect[]>> = {
  waves: [[3, 3, 4, 1], [11, 5, 4, 1], [6, 10, 4, 1], [13, 12, 3, 1], [0, 12, 1, 1]],
  stars: [[5, 3, 1, 1], [12, 7, 1, 1], [2, 10, 1, 1], [9, 13, 1, 1], [14, 1, 1, 1]],
  door: [[2, 2, 12, 1], [2, 13, 12, 1], [2, 2, 1, 12], [13, 2, 1, 12], [7, 7, 2, 2]],
};

export const isAnimatedTile = (tile: TileDef): boolean => tile.pattern in ANIMATED_PATTERNS;

export const tilesetKey = (settingId: string): string => `tiles-${settingId}`;

/**
 * Тайлсет сеттинга: тайлы в ряд, в порядке `Object.keys(setting.tiles)`, затем тот же ряд
 * ещё раз — вторым кадром анимации. Индекс второго кадра = индекс тайла + число тайлов.
 */
export const ensureTilesetTexture = (scene: Phaser.Scene, setting: SettingDef): string => {
  const key = tilesetKey(setting.id);
  if (scene.textures.exists(key)) return key;
  const entries = Object.entries(setting.tiles);
  const texture = scene.textures.createCanvas(key, entries.length * 2 * TILE_SIZE, TILE_SIZE);
  if (!texture) throw new Error(`Не удалось создать текстуру ${key}`);
  const ctx = texture.getContext();
  for (const frame of [0, 1] as const) {
    entries.forEach(([char, tile], index) => {
      const ox = (frame * entries.length + index) * TILE_SIZE;
      const art = hasTileArt(setting.id, char) ? getArtSource(scene, tileArtKey(setting.id, char)) : null;
      if (art) {
        // Нарисованных вторых кадров анимации нет — оба кадра показывают один и тот же арт.
        drawArt(ctx, art, ox, TILE_SIZE);
        return;
      }
      const pattern = (frame === 1 ? ANIMATED_PATTERNS[tile.pattern] : undefined) ?? PATTERNS[tile.pattern];
      fill(ctx, ox, css(tile.color), [[0, 0, TILE_SIZE, TILE_SIZE]]);
      fill(ctx, ox, css(tile.accent), pattern);
    });
  }
  texture.refresh();
  return key;
};

const FACINGS: readonly Facing[] = ['down', 'up', 'left', 'right'];

/** Номер кадра в текстуре персонажа: 4 направления × 2 кадра шага. */
export const characterFrame = (facing: Facing, step: 0 | 1): number => FACINGS.indexOf(facing) * 2 + step;

/**
 * Персонажи рисуются крупнее тайла (128→16px «кашу» из AI-арта исправили, подняв итоговый
 * размер кадра до 2 тайлов — см. `WorldScene` про компенсирующий сдвиг по Y).
 */
const CHAR_SIZE = TILE_SIZE * 2;

/**
 * `id` — идентификатор персонажа в контенте (`player`, `npc.id`): по нему ищется готовый арт.
 * Нарисованного кадра ходьбы нет — при наличии арта все 8 кадров показывают один и тот же рисунок.
 */
export const ensureCharacterTexture = (scene: Phaser.Scene, key: string, id: string, look: SpriteLook): string => {
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, CHAR_SIZE * FACINGS.length * 2, CHAR_SIZE);
  if (!texture) throw new Error(`Не удалось создать текстуру ${key}`);
  const ctx = texture.getContext();
  const art = hasCharacterArt(id) ? getArtSource(scene, characterArtKey(id)) : null;
  const hat = css(look.hat);
  const skin = css(look.skin);
  const body = css(look.body);

  FACINGS.forEach((facing, facingIndex) => {
    for (const step of [0, 1] as const) {
      const frame = facingIndex * 2 + step;
      const ox = frame * CHAR_SIZE;
      if (art) {
        drawArt(ctx, art, ox, CHAR_SIZE);
      } else {
        // Процедурная заглушка рисуется в прежней 16-пиксельной сетке, затем масштабируется ×2.
        ctx.save();
        ctx.translate(ox, 0);
        ctx.scale(2, 2);
        fill(ctx, 0, INK, [[3, 0, 10, 9], [2, 7, 12, 7]]);
        fill(ctx, 0, skin, [[4, 3, 8, 5], [2, 9, 1, 3], [13, 9, 1, 3]]);
        fill(ctx, 0, hat, facing === 'up' ? [[4, 1, 8, 6]] : [[4, 1, 8, 3]]);
        fill(ctx, 0, body, [[3, 8, 10, 5]]);
        if (facing === 'down') fill(ctx, 0, INK, [[6, 5, 1, 2], [9, 5, 1, 2]]);
        if (facing === 'left') fill(ctx, 0, INK, [[5, 5, 1, 2]]);
        if (facing === 'right') fill(ctx, 0, INK, [[10, 5, 1, 2]]);
        fill(ctx, 0, INK, step === 0 ? [[5, 13, 2, 3], [9, 13, 2, 3]] : [[5, 13, 2, 3], [9, 13, 2, 1]]);
        ctx.restore();
      }
      texture.add(frame, 0, ox, 0, CHAR_SIZE, CHAR_SIZE);
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

export const PARTICLE_TEXTURE = 'particle-dot';

/** Белая точка 3×3 — один спрайт для всех частиц, цвет красится через `tint` при эмиссии. */
export const ensureParticleTexture = (scene: Phaser.Scene): string =>
  ensureIconTexture(scene, PARTICLE_TEXTURE, 3, 3, [{ color: 0xffffff, rects: [[0, 0, 3, 3]] }]);
