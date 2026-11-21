import * as Phaser from 'phaser';
import type { WorldObjectDef } from '@core/content/types';
import type { SessionEvent } from '@core/session/gameSession';
import { TILE_SIZE, tileCenter } from '@core/world/tileMap';
import { audio } from '@/audio/chiptune';
import type { RenderContext } from '../context';
import { getRenderContext, SCENE_KEYS } from '../context';
import type { Facing } from '@core/world/world';
import {
  characterFrame,
  ensureCharacterTexture,
  ensureIconTexture,
  ensureParticleTexture,
  ensureTilesetTexture,
  isAnimatedTile,
  PARTICLE_TEXTURE,
  preloadArt,
} from '../textures';

const CAMERA_LERP = 0.12;
const STEP_FRAME_MS = 160;
const TILE_FRAME_MS = 500;
/** На таком расстоянии (в пикселях) NPC поворачивается к игроку. */
const NPC_NOTICE_RANGE = TILE_SIZE * 3;

const INK = 0x14121f;

interface SimpleParticle {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  bornAt: number;
  lifespan: number;
  scaleFrom: number;
  alphaFrom: number;
}

type AmbientKind = 'spark' | 'splash';

interface AmbientSource {
  x: number;
  y: number;
  kind: AmbientKind;
  nextAt: number;
}

/** min..max — случайный разброс значения. */
const between = (min: number, max: number): number => min + Math.random() * (max - min);

const AMBIENT_FREQUENCY_MS: Record<AmbientKind, number> = { spark: 350, splash: 650 };

/** Сцена мира: тайловая карта, NPC, игрок и камера, плавно следующая за ним. */
export class WorldScene extends Phaser.Scene {
  private ctx!: RenderContext;
  private map: Phaser.Tilemaps.Tilemap | null = null;
  private player!: Phaser.GameObjects.Sprite;
  private prompt!: Phaser.GameObjects.Image;
  private npcSprites: { sprite: Phaser.GameObjects.Sprite; index: number }[] = [];
  private objectSprites: { sprite: Phaser.GameObjects.Image; object: WorldObjectDef }[] = [];
  /** Тайлы с анимацией: позиция и индекс первого кадра. */
  private animatedTiles: { x: number; y: number; index: number }[] = [];
  private tileCount = 0;
  private tileFrame = 0;
  private unsubscribe: (() => void) | null = null;
  private lastStepPhase = 0;
  /**
   * Свои частицы поверх обычных Image: штатный Phaser ParticleEmitter в 4.2.1 не рисуется,
   * пока камера скроллит (проверено — эмиттер со scrollFactor(0) рисуется, без него нет).
   */
  private particles: SimpleParticle[] = [];
  /** Источники факелов и воды — спавнят частицы по таймеру, пересобираются с картой. */
  private ambientSources: AmbientSource[] = [];

  constructor() {
    super(SCENE_KEYS.world);
  }

  /** Очередь загрузки готового арта — к моменту `create()` он уже на месте (см. `textures.ts`). */
  preload(): void {
    preloadArt(this);
  }

  create(): void {
    this.ctx = getRenderContext(this);
    const { session } = this.ctx;

    const playerKey = ensureCharacterTexture(this, 'char-player', 'player', session.content.data.player.look);
    this.player = this.add.sprite(0, 0, playerKey, 0).setDepth(10);

    ensureParticleTexture(this);

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
    ensureIconTexture(this, 'object-door', TILE_SIZE, TILE_SIZE, [
      { color: INK, rects: [[1, 1, 14, 14]] },
      { color: 0x5e3c1a, rects: [[2, 2, 12, 12]] },
      { color: 0x8a5a2b, rects: [[2, 2, 2, 12], [12, 2, 2, 12], [2, 2, 12, 2], [2, 12, 12, 2]] },
    ]);
    ensureIconTexture(this, 'object-door-open', TILE_SIZE, TILE_SIZE, [
      { color: INK, rects: [[1, 1, 14, 14]] },
      { color: 0x3a2a18, rects: [[2, 2, 12, 12]] },
      { color: 0x8a5a2b, rects: [[1, 1, 3, 14]] },
    ]);
    ensureIconTexture(this, 'object-lever', TILE_SIZE, TILE_SIZE, [
      { color: INK, rects: [[5, 10, 6, 5]] },
      { color: 0x8a5a2b, rects: [[6, 11, 4, 3]] },
      { color: 0xc9a66b, rects: [[7, 2, 2, 10]] },
      { color: 0xd94e4e, rects: [[5, 1, 6, 3]] },
    ]);
    ensureIconTexture(this, 'object-lever-pulled', TILE_SIZE, TILE_SIZE, [
      { color: INK, rects: [[5, 10, 6, 5]] },
      { color: 0x8a5a2b, rects: [[6, 11, 4, 3]] },
      { color: 0xc9a66b, rects: [[2, 7, 10, 2]] },
      { color: 0x6bdc6b, rects: [[1, 6, 4, 4]] },
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
    const stepPhase = Math.floor(this.time.now / STEP_FRAME_MS) % 2;
    const step = state.moving && stepPhase === 1 ? 1 : 0;
    this.player.setFrame(characterFrame(state.facing, step));

    // След пыли — залпом на каждую смену фазы шага, пока игрок идёт.
    if (state.moving && stepPhase !== this.lastStepPhase) {
      this.spawnDust(state.x, state.y + 6);
      audio.playSfx('step');
    }
    this.lastStepPhase = stepPhase;

    const prompt = session.interactionPrompt();
    this.prompt.setVisible(prompt !== null);
    if (prompt) {
      const center = tileCenter(prompt.at);
      const bob = Math.floor(this.time.now / 300) % 2;
      this.prompt.setPosition(center.x, center.y - TILE_SIZE - bob);
    }

    // Патрулирующие NPC идут по маршруту; у игрока рядом — поворачиваются к нему, а не идут дальше по курсу.
    for (const { sprite, index } of this.npcSprites) {
      const view = session.world.npcView(index);
      sprite.setPosition(Math.round(view.x), Math.round(view.y) - 2);
      const dx = state.x - view.x;
      const dy = state.y - view.y;
      let facing: Facing = view.facing;
      if (Math.hypot(dx, dy) <= NPC_NOTICE_RANGE) {
        facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      }
      const npcStep = view.moving && Math.floor(this.time.now / STEP_FRAME_MS) % 2 === 1 ? 1 : 0;
      sprite.setFrame(characterFrame(facing, npcStep));
    }

    for (const { sprite, object } of this.objectSprites) {
      if (object.type === 'chest' || object.type === 'door' || object.type === 'lever') {
        sprite.setTexture(this.objectTextureKey(object));
      }
    }

    this.animateTiles();
    this.updateAmbientSources();
    this.updateParticles(delta);
  }

  /** Текстура объекта с учётом его текущего состояния (открыт сундук/дверь, потянут ли рычаг). */
  private objectTextureKey(object: WorldObjectDef): string {
    const { session } = this.ctx;
    switch (object.type) {
      case 'sign':
        return 'object-sign';
      case 'chest':
        return session.isChestOpened(object.id) ? 'object-chest-open' : 'object-chest';
      case 'door':
        return session.isDoorOpen(object.id) ? 'object-door-open' : 'object-door';
      case 'lever':
        return object.opens.every((doorId) => session.isDoorOpen(doorId)) ? 'object-lever-pulled' : 'object-lever';
    }
  }

  /** Запускает один спрайт-частицу: летит по вектору, тускнеет и исчезает за `lifespan` мс. */
  private spawnParticle(
    x: number,
    y: number,
    opts: { tint: number; vx: number; vy: number; lifespan: number; scale: number; alpha: number; depth: number },
  ): void {
    const sprite = this.add
      .image(x, y, PARTICLE_TEXTURE)
      .setTint(opts.tint)
      .setScale(opts.scale)
      .setAlpha(opts.alpha)
      .setDepth(opts.depth);
    this.particles.push({
      sprite,
      vx: opts.vx,
      vy: opts.vy,
      bornAt: this.time.now,
      lifespan: opts.lifespan,
      scaleFrom: opts.scale,
      alphaFrom: opts.alpha,
    });
  }

  /** След пыли под ногами идущего игрока. */
  private spawnDust(x: number, y: number): void {
    for (let i = 0; i < 2; i++) {
      const angle = Phaser.Math.DegToRad(between(200, 340));
      const speed = between(6, 18);
      this.spawnParticle(x, y, {
        tint: 0xc9a66b,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifespan: 260,
        scale: 1,
        alpha: 0.5,
        depth: 9,
      });
    }
  }

  /** Искра у факела или капля над водой, в зависимости от вида источника. */
  private spawnAmbientParticle(source: AmbientSource): void {
    const angle = Phaser.Math.DegToRad(between(255, 285));
    if (source.kind === 'spark') {
      const speed = between(4, 10);
      this.spawnParticle(source.x, source.y - 4, {
        tint: Math.random() < 0.5 ? 0xf2a33a : 0xffe066,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifespan: 500,
        scale: 1,
        alpha: 1,
        depth: 6,
      });
    } else {
      const speed = between(2, 6);
      this.spawnParticle(source.x, source.y, {
        tint: 0xf2fbff,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifespan: 700,
        scale: 1.3,
        alpha: 0.9,
        depth: 3,
      });
    }
  }

  /** Запускает частицу из каждого источника, время которого пришло. */
  private updateAmbientSources(): void {
    for (const source of this.ambientSources) {
      if (this.time.now < source.nextAt) continue;
      this.spawnAmbientParticle(source);
      source.nextAt = this.time.now + AMBIENT_FREQUENCY_MS[source.kind];
    }
  }

  /** Двигает частицы и гасит их по возрасту; угасшие — уничтожает и убирает из списка. */
  private updateParticles(delta: number): void {
    const dt = delta / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      if (!particle) continue;
      const age = this.time.now - particle.bornAt;
      if (age >= particle.lifespan) {
        particle.sprite.destroy();
        this.particles.splice(i, 1);
        continue;
      }
      const t = age / particle.lifespan;
      particle.sprite.x += particle.vx * dt;
      particle.sprite.y += particle.vy * dt;
      particle.sprite.setScale(particle.scaleFrom * (1 - t));
      particle.sprite.setAlpha(particle.alphaFrom * (1 - t));
    }
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
    for (const particle of this.particles) particle.sprite.destroy();
    this.npcSprites = [];
    this.objectSprites = [];
    this.animatedTiles = [];
    this.ambientSources = [];
    this.particles = [];
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
        // Искры у факелов, брызги у воды — тайлы различаются только названием и узором анимации.
        const kind: AmbientKind | null = tile?.name === 'Факел' ? 'spark' : tile?.pattern === 'waves' ? 'splash' : null;
        if (kind) {
          const center = tileCenter({ x, y });
          this.ambientSources.push({ x: center.x, y: center.y, kind, nextAt: this.time.now + between(0, AMBIENT_FREQUENCY_MS[kind]) });
        }
      }
      data.push(row);
    }

    const tilesKey = ensureTilesetTexture(this, tileMap.setting);
    this.map = this.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = this.map.addTilesetImage(tilesKey, tilesKey, TILE_SIZE, TILE_SIZE, 0, 0);
    if (!tileset) throw new Error(`Тайлсет ${tilesKey} не создан`);
    this.map.createLayer(0, tileset, 0, 0)?.setDepth(0);

    world.level.npcs.forEach((placement, index) => {
      const npc = content.npc(placement.npcId);
      const key = ensureCharacterTexture(this, `char-${npc.id}`, npc.id, npc.look);
      const view = world.npcView(index);
      const sprite = this.add.sprite(view.x, view.y - 2, key, characterFrame(view.facing, 0)).setDepth(5);
      this.npcSprites.push({ sprite, index });
    });

    for (const object of world.level.objects ?? []) {
      const center = tileCenter(object.at);
      const sprite = this.add.image(center.x, center.y, this.objectTextureKey(object)).setDepth(4);
      this.objectSprites.push({ sprite, object });
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
