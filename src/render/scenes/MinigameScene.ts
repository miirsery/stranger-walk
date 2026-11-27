import * as Phaser from 'phaser';
import { CATCH_BASKET, CATCH_FIELD, CATCH_ITEM_SIZE } from '@core/minigames/catchGame';
import type { CatchGame } from '@core/minigames/catchGame';
import { FISHING_BOBBER, FISHING_FIELD, FISHING_FISH_SIZE, FISHING_MAX_PROGRESS } from '@core/minigames/fishingGame';
import type { FishingGame } from '@core/minigames/fishingGame';
import type { RhythmGame } from '@core/minigames/rhythmGame';
import type { RenderContext } from '../context';
import { getRenderContext, SCENE_KEYS } from '../context';
import { ensureIconTexture } from '../textures';

/** Ширина полоски шкалы поимки и зазор между ней и полем рыбалки. */
const FISHING_BAR_WIDTH = 10;
const FISHING_GAP = 10;

/** Поле мини-игры «рыбалка» вместе с полоской шкалы — для расчёта зума камеры. */
const FISHING_SCENE_SIZE = { width: FISHING_FIELD.width + FISHING_GAP + FISHING_BAR_WIDTH, height: FISHING_FIELD.height } as const;

/** Поле мини-игры «ритм»: дорожка, по которой ноты едут справа к отметке слева. */
const RHYTHM_FIELD = { width: 160, height: 40 } as const;
const RHYTHM_HIT_X = 24;
const RHYTHM_NOTE_SIZE = 12;
/** За сколько мс до своего такта нота появляется у правого края дорожки. */
const RHYTHM_LOOKAHEAD_MS = 1200;

type FieldType = 'catch' | 'fishing' | 'rhythm' | null;

/**
 * Сцена мини-игр. Вся логика — в ядре (`core/minigames`), здесь только отрисовка состояния.
 * Новые типы мини-игр добавляют ветку по `game.type`.
 */
export class MinigameScene extends Phaser.Scene {
  private ctx!: RenderContext;
  private basket!: Phaser.GameObjects.Image;
  private fieldType: FieldType = null;
  private readonly items = new Map<number, Phaser.GameObjects.Image>();

  private bobber!: Phaser.GameObjects.Image;
  private fish!: Phaser.GameObjects.Image;
  private progressFill!: Phaser.GameObjects.Rectangle;

  private readonly notes = new Map<number, Phaser.GameObjects.Image>();

  constructor() {
    super(SCENE_KEYS.minigame);
  }

  create(): void {
    this.ctx = getRenderContext(this);
    this.items.clear();
    this.notes.clear();
    this.cameras.main.setBackgroundColor(0x14121f);

    const mode = this.ctx.session.mode;
    const type = mode.kind === 'minigame' ? mode.game.type : null;
    this.fieldType = type === 'catch' || type === 'fishing' || type === 'rhythm' ? type : null;
    // Игры без «поля» (например, память) рисует Vue; сцена лишь двигает время сессии.
    if (this.fieldType === 'catch') this.createCatchField();
    else if (this.fieldType === 'fishing') this.createFishingField();
    else if (this.fieldType === 'rhythm') this.createRhythmField();
    else return;

    this.fitCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    });
  }

  private createCatchField(): void {
    ensureIconTexture(this, 'catch-good', CATCH_ITEM_SIZE, CATCH_ITEM_SIZE, [
      { color: 0x14121f, rects: [[1, 1, 6, 7], [0, 2, 8, 5]] },
      { color: 0xd94f4f, rects: [[1, 2, 6, 5], [2, 7, 4, 1]] },
      { color: 0xf5b8a8, rects: [[2, 3, 1, 2]] },
      { color: 0x4c9a4a, rects: [[4, 0, 2, 2]] },
    ]);
    ensureIconTexture(this, 'catch-hazard', CATCH_ITEM_SIZE, CATCH_ITEM_SIZE, [
      { color: 0x14121f, rects: [[1, 1, 6, 7], [0, 2, 8, 5]] },
      { color: 0x6b5a2e, rects: [[1, 2, 6, 5], [2, 7, 4, 1]] },
      { color: 0x3a2f14, rects: [[2, 3, 2, 2], [5, 5, 1, 1]] },
      { color: 0x8a5a2b, rects: [[4, 0, 1, 2]] },
    ]);
    const basketKey = ensureIconTexture(this, 'catch-basket', CATCH_BASKET.width, CATCH_BASKET.height, [
      { color: 0x14121f, rects: [[0, 0, CATCH_BASKET.width, CATCH_BASKET.height]] },
      { color: 0xc9a66b, rects: [[1, 1, CATCH_BASKET.width - 2, CATCH_BASKET.height - 2]] },
      { color: 0x8a5a2b, rects: [[1, 3, CATCH_BASKET.width - 2, 1], [5, 1, 1, 6], [11, 1, 1, 6], [17, 1, 1, 6]] },
    ]);

    this.add.rectangle(0, 0, CATCH_FIELD.width, CATCH_FIELD.height, 0x7ec8f2).setOrigin(0);
    this.add.rectangle(0, CATCH_FIELD.height - 4, CATCH_FIELD.width, 4, 0x4c9a4a).setOrigin(0);
    this.basket = this.add.image(0, 0, basketKey).setOrigin(0.5, 0);
  }

  private createFishingField(): void {
    const bobberKey = ensureIconTexture(this, 'fishing-bobber', FISHING_BOBBER.width, FISHING_BOBBER.height, [
      { color: 0x14121f, rects: [[0, 0, FISHING_BOBBER.width, FISHING_BOBBER.height]] },
      { color: 0xc9a66b, rects: [[1, 1, FISHING_BOBBER.width - 2, FISHING_BOBBER.height - 2]] },
      { color: 0xd94f4f, rects: [[1, 1, FISHING_BOBBER.width - 2, 4]] },
    ]);
    const fishKey = ensureIconTexture(this, 'fishing-fish', FISHING_FISH_SIZE, FISHING_FISH_SIZE, [
      { color: 0x14121f, rects: [[0, 4, 2, 4]] },
      { color: 0xf2a33a, rects: [[2, 2, 8, 8]] },
      { color: 0x14121f, rects: [[9, 4, 2, 2], [9, 8, 2, 2]] },
    ]);

    this.add.rectangle(0, 0, FISHING_FIELD.width, FISHING_FIELD.height, 0x1d3a5f).setOrigin(0);
    this.bobber = this.add.image(FISHING_FIELD.width / 2, 0, bobberKey);
    this.fish = this.add.image(FISHING_FIELD.width / 2, 0, fishKey);

    const barX = FISHING_FIELD.width + FISHING_GAP;
    this.add.rectangle(barX, 0, FISHING_BAR_WIDTH, FISHING_FIELD.height, 0x262231).setOrigin(0);
    this.progressFill = this.add.rectangle(barX, FISHING_FIELD.height, FISHING_BAR_WIDTH, 0, 0x7fd68a).setOrigin(0, 1);
  }

  private createRhythmField(): void {
    ensureIconTexture(this, 'rhythm-note', RHYTHM_NOTE_SIZE, RHYTHM_NOTE_SIZE, [
      { color: 0x14121f, rects: [[0, 0, RHYTHM_NOTE_SIZE, RHYTHM_NOTE_SIZE]] },
      { color: 0xf2d94e, rects: [[1, 1, RHYTHM_NOTE_SIZE - 2, RHYTHM_NOTE_SIZE - 2]] },
    ]);

    this.add.rectangle(0, 0, RHYTHM_FIELD.width, RHYTHM_FIELD.height, 0x262231).setOrigin(0);
    this.add.rectangle(RHYTHM_HIT_X, 0, 3, RHYTHM_FIELD.height, 0xf2a33a).setOrigin(0.5, 0);
  }

  override update(_time: number, delta: number): void {
    const { session, input, paused } = this.ctx;
    if (!paused) session.update(delta, input.getMove());
    const mode = session.mode;
    if (mode.kind !== 'minigame') return;

    if (mode.game.type === 'catch' && this.fieldType === 'catch') this.updateCatchField(mode.game);
    else if (mode.game.type === 'fishing' && this.fieldType === 'fishing') this.updateFishingField(mode.game);
    else if (mode.game.type === 'rhythm' && this.fieldType === 'rhythm') this.updateRhythmField(mode.game);
  }

  private updateCatchField(game: CatchGame): void {
    this.basket.setPosition(Math.round(game.basketX), CATCH_BASKET.y);
    const alive = new Set<number>();
    for (const item of game.items) {
      alive.add(item.id);
      let sprite = this.items.get(item.id);
      if (!sprite) {
        sprite = this.add.image(0, 0, item.kind === 'good' ? 'catch-good' : 'catch-hazard');
        this.items.set(item.id, sprite);
      }
      sprite.setPosition(Math.round(item.x), Math.round(item.y));
    }
    for (const [id, sprite] of this.items) {
      if (!alive.has(id)) {
        sprite.destroy();
        this.items.delete(id);
      }
    }
  }

  private updateFishingField(game: FishingGame): void {
    this.bobber.setPosition(FISHING_FIELD.width / 2, Math.round(game.bobberY));
    this.fish.setPosition(FISHING_FIELD.width / 2, Math.round(game.fishY));
    const fraction = game.progress / FISHING_MAX_PROGRESS;
    this.progressFill.height = FISHING_FIELD.height * fraction;
  }

  private updateRhythmField(game: RhythmGame): void {
    const alive = new Set<number>();
    game.notes.forEach((note, index) => {
      if (note.resolved) return;
      const msToHit = note.timeMs - game.elapsedMs;
      if (msToHit > RHYTHM_LOOKAHEAD_MS) return;
      alive.add(index);
      let sprite = this.notes.get(index);
      if (!sprite) {
        sprite = this.add.image(0, 0, 'rhythm-note');
        this.notes.set(index, sprite);
      }
      const x = RHYTHM_HIT_X + (msToHit / RHYTHM_LOOKAHEAD_MS) * (RHYTHM_FIELD.width - RHYTHM_HIT_X);
      sprite.setPosition(Math.round(x), RHYTHM_FIELD.height / 2);
    });
    for (const [index, sprite] of this.notes) {
      if (!alive.has(index)) {
        sprite.destroy();
        this.notes.delete(index);
      }
    }
  }

  /** Поле по центру экрана, увеличенное в целое число раз. */
  private fitCamera(): void {
    const camera = this.cameras.main;
    const size = this.fieldType === 'fishing' ? FISHING_SCENE_SIZE : this.fieldType === 'rhythm' ? RHYTHM_FIELD : CATCH_FIELD;
    const zoom = Math.max(1, Math.floor(Math.min(camera.width / size.width, camera.height / (size.height + 40))));
    camera.setZoom(zoom);
    camera.centerOn(size.width / 2, size.height / 2);
  }
}
