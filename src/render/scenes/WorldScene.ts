import * as Phaser from 'phaser';
import type { Point, WorldObjectDef } from '@core/content/types';
import type { SessionEvent } from '@core/session/gameSession';
import { TILE_SIZE, tileCenter } from '@core/world/tileMap';
import type { RenderContext } from '../context';
import { getRenderContext, SCENE_KEYS } from '../context';
import type { Facing } from '@core/world/world';
import {
  characterFrame,
  ensureCharacterTexture,
  ensureIconTexture,
  ensureTilesetTexture,
  isAnimatedTile,
} from '../textures';

const CAMERA_LERP = 0.12;
const STEP_FRAME_MS = 160;
const TILE_FRAME_MS = 500;
/** На таком расстоянии (в пикселях) NPC поворачивается к игроку. */
const NPC_NOTICE_RANGE = TILE_SIZE * 3;

const INK = 0x14121f;

/** Сцена мира: тайловая карта, NPC, игрок и камера, плавно следующая за ним. */
export class WorldScene extends Phaser.Scene {
  private ctx!: RenderContext;
  private map: Phaser.Tilemaps.Tilemap | null = null;
  private player!: Phaser.GameObjects.Sprite;
  private prompt!: Phaser.GameObjects.Image;
  private npcSprites: { sprite: Phaser.GameObjects.Sprite; at: Point }[] = [];
  private objectSprites: { sprite: Phaser.GameObjects.Image; object: WorldObjectDef }[] = [];
  /** Тайлы с анимацией: позиция и индекс первого кадра. */
  private animatedTiles: { x: number; y: number; index: number }[] = [];
  private tileCount = 0;
  private tileFrame = 0;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super(SCENE_KEYS.world);
  }

  create(): void {
    this.ctx = getRenderContext(this);
    const { session } = this.ctx;

    const playerKey = ensureCharacterTexture(this, 'char-player', session.content.data.player.look);
    this.player = this.add.sprite(0, 0, playerKey, 0).setDepth(10);

    const promptKey = ensureIconTexture(this, 'icon-prompt', 7, 9, [
      { color: 0x14121f, rects: [[0, 0, 7, 9]] },
      { color: 0xf2d94e, rects: [[1, 1, 5, 7]] },
      { color: 0x14121f, rects: [[3, 2, 1, 3], [3, 6, 1, 1]] },
    ]);
    this.prompt = this.add.image(0, 0, promptKey).setDepth(20).setVisible(false);

    ensureIconTexture(this, 'object-sign', TILE_SIZE, TILE_SIZE, [
      { color: INK, rects: [[1, 2, 14, 9], [7, 11, 2, 5]] },
      { color: 0xc9a66b, rects: [[2, 3, 12, 7]] },
      { color: 0x8a5a2b, rects: [[4, 5, 8, 1], [4, 7, 6, 1]] },
    ]);
    ensureIconTexture(this, 'object-chest', TILE_SIZE, TILE_SIZE, [
      { color: INK, rects: [[1, 4, 14, 11]] },
      { color: 0x8a5a2b, rects: [[2, 5, 12, 9]] },
      { color: 0x5e3c1a, rects: [[2, 9, 12, 1]] },
      { color: 0xf2d94e, rects: [[7, 8, 2, 3], [2, 5, 12, 1]] },
    ]);
    ensureIconTexture(this, 'object-chest-open', TILE_SIZE, TILE_SIZE, [
      { color: INK, rects: [[1, 1, 14, 14]] },
      { color: 0x5e3c1a, rects: [[2, 2, 12, 5]] },
      { color: INK, rects: [[3, 7, 10, 2]] },
      { color: 0x8a5a2b, rects: [[2, 9, 12, 5]] },
    ]);

    this.buildLevel();
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);

    this.unsubscribe = session.events.on((event: SessionEvent) => {
      if (event.type === 'levelChanged') {
        this.buildLevel();
        this.cameras.main.fadeIn(250, 20, 18, 31);
      }
    });
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.game.events.emit('world-ready');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    });
  }

  override update(_time: number, delta: number): void {
    const { session, input, paused } = this.ctx;
    if (!paused) session.update(delta, input.getMove());

    const state = session.world.player;
    this.player.setPosition(Math.round(state.x), Math.round(state.y) - 2);
    const step = state.moving && Math.floor(this.time.now / STEP_FRAME_MS) % 2 === 1 ? 1 : 0;
    this.player.setFrame(characterFrame(state.facing, step));

    const prompt = session.interactionPrompt();
    this.prompt.setVisible(prompt !== null);
    if (prompt) {
      const center = tileCenter(prompt.at);
      const bob = Math.floor(this.time.now / 300) % 2;
      this.prompt.setPosition(center.x, center.y - TILE_SIZE - bob);
    }

    // NPC поворачиваются к игроку, когда он рядом.
    for (const { sprite, at } of this.npcSprites) {
      const center = tileCenter(at);
      const dx = state.x - center.x;
      const dy = state.y - center.y;
      let facing: Facing = 'down';
      if (Math.hypot(dx, dy) <= NPC_NOTICE_RANGE) {
        if (Math.abs(dx) > Math.abs(dy)) facing = dx > 0 ? 'right' : 'left';
        else facing = dy > 0 ? 'down' : 'up';
      }
      sprite.setFrame(characterFrame(facing, 0));
    }

    for (const { sprite, object } of this.objectSprites) {
      if (object.type === 'chest') {
        sprite.setTexture(session.isChestOpened(object.id) ? 'object-chest-open' : 'object-chest');
      }
    }

    this.animateTiles();
  }

  /** Переключает кадр «живых» тайлов (вода, звёзды, огни) два раза в секунду. */
  private animateTiles(): void {
    const frame = Math.floor(this.time.now / TILE_FRAME_MS) % 2;
    if (frame === this.tileFrame || !this.map) return;
    this.tileFrame = frame;
    for (const tile of this.animatedTiles) {
      this.map.putTileAt(tile.index + frame * this.tileCount, tile.x, tile.y);
    }
  }

  /** Пересобирает карту и NPC для текущего уровня сессии. */
  private buildLevel(): void {
    const { session } = this.ctx;
    const { world, content } = session;
    const tileMap = world.map;

    this.map?.destroy();
    for (const { sprite } of this.npcSprites) sprite.destroy();
    for (const { sprite } of this.objectSprites) sprite.destroy();
    this.npcSprites = [];
    this.objectSprites = [];
    this.animatedTiles = [];
    this.tileFrame = 0;
    this.tileCount = tileMap.tileChars.length;

    const data: number[][] = [];
    for (let y = 0; y < tileMap.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < tileMap.width; x++) {
        const index = tileMap.tileIndexAt(x, y);
        row.push(index);
        const tile = tileMap.tileAt(x, y);
        if (tile && isAnimatedTile(tile)) this.animatedTiles.push({ x, y, index });
      }
      data.push(row);
    }

    const tilesKey = ensureTilesetTexture(this, tileMap.setting);
    this.map = this.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = this.map.addTilesetImage(tilesKey, tilesKey, TILE_SIZE, TILE_SIZE, 0, 0);
    if (!tileset) throw new Error(`Тайлсет ${tilesKey} не создан`);
    this.map.createLayer(0, tileset, 0, 0)?.setDepth(0);

    for (const placement of world.level.npcs) {
      const npc = content.npc(placement.npcId);
      const key = ensureCharacterTexture(this, `char-${npc.id}`, npc.look);
      const center = tileCenter(placement.at);
      const sprite = this.add.sprite(center.x, center.y - 2, key, characterFrame('down', 0)).setDepth(5);
      this.npcSprites.push({ sprite, at: placement.at });
    }

    for (const object of world.level.objects ?? []) {
      const center = tileCenter(object.at);
      const key = object.type === 'sign' ? 'object-sign' : 'object-chest';
      this.objectSprites.push({ sprite: this.add.image(center.x, center.y, key).setDepth(4), object });
    }

    this.cameras.main.setBackgroundColor(tileMap.setting.backgroundColor);
    this.fitCamera();
    this.cameras.main.centerOn(world.player.x, world.player.y);
  }

  /** Границы камеры = карта; если карта меньше экрана — центрируем её. */
  private fitCamera(): void {
    const camera = this.cameras.main;
    const { pixelWidth, pixelHeight } = this.ctx.session.world.map;
    const width = Math.max(pixelWidth, camera.width);
    const height = Math.max(pixelHeight, camera.height);
    camera.setBounds(Math.floor((pixelWidth - width) / 2), Math.floor((pixelHeight - height) / 2), width, height);
  }
}
