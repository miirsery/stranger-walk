import * as Phaser from 'phaser';
import type { SessionEvent } from '@core/session/gameSession';
import { TILE_SIZE, tileCenter } from '@core/world/tileMap';
import type { RenderContext } from '../context';
import { getRenderContext, SCENE_KEYS } from '../context';
import { characterFrame, ensureCharacterTexture, ensureIconTexture, ensureTilesetTexture } from '../textures';

const CAMERA_LERP = 0.12;
const STEP_FRAME_MS = 160;

/** Сцена мира: тайловая карта, NPC, игрок и камера, плавно следующая за ним. */
export class WorldScene extends Phaser.Scene {
  private ctx!: RenderContext;
  private map: Phaser.Tilemaps.Tilemap | null = null;
  private player!: Phaser.GameObjects.Sprite;
  private prompt!: Phaser.GameObjects.Image;
  private npcSprites: Phaser.GameObjects.Sprite[] = [];
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

    this.buildLevel();
    this.cameras.main.startFollow(this.player, true, CAMERA_LERP, CAMERA_LERP);

    this.unsubscribe = session.events.on((event: SessionEvent) => {
      if (event.type === 'levelChanged') {
        this.buildLevel();
        this.cameras.main.fadeIn(250, 20, 18, 31);
      }
    });
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
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

    const npc = session.mode.kind === 'world' ? session.world.findInteractableNpc() : undefined;
    this.prompt.setVisible(npc !== undefined);
    if (npc) {
      const center = tileCenter(npc.at);
      const bob = Math.floor(this.time.now / 300) % 2;
      this.prompt.setPosition(center.x, center.y - TILE_SIZE - bob);
    }
  }

  /** Пересобирает карту и NPC для текущего уровня сессии. */
  private buildLevel(): void {
    const { session } = this.ctx;
    const { world, content } = session;
    const tileMap = world.map;

    this.map?.destroy();
    for (const sprite of this.npcSprites) sprite.destroy();
    this.npcSprites = [];

    const data: number[][] = [];
    for (let y = 0; y < tileMap.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < tileMap.width; x++) row.push(tileMap.tileIndexAt(x, y));
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
      this.npcSprites.push(this.add.sprite(center.x, center.y - 2, key, characterFrame('down', 0)).setDepth(5));
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
