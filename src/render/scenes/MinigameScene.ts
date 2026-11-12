import * as Phaser from 'phaser';
import { CATCH_BASKET, CATCH_FIELD, CATCH_ITEM_SIZE } from '@core/minigames/catchGame';
import type { RenderContext } from '../context';
import { getRenderContext, SCENE_KEYS } from '../context';
import { ensureIconTexture } from '../textures';

/**
 * Сцена мини-игр. Вся логика — в ядре (`core/minigames`), здесь только отрисовка состояния.
 * Новые типы мини-игр добавляют ветку по `game.type`.
 */
export class MinigameScene extends Phaser.Scene {
  private ctx!: RenderContext;
  private basket!: Phaser.GameObjects.Image;
  private drawsField = false;
  private readonly items = new Map<number, Phaser.GameObjects.Image>();

  constructor() {
    super(SCENE_KEYS.minigame);
  }

  create(): void {
    this.ctx = getRenderContext(this);
    this.items.clear();
    this.cameras.main.setBackgroundColor(0x14121f);

    const mode = this.ctx.session.mode;
    this.drawsField = mode.kind === 'minigame' && mode.game.type === 'catch';
    // Игры без «поля» (например, память) рисует Vue; сцена лишь двигает время сессии.
    if (!this.drawsField) return;

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

    this.fitCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    });
  }

  override update(_time: number, delta: number): void {
    const { session, input, paused } = this.ctx;
    if (!paused) session.update(delta, input.getMove());
    const mode = session.mode;
    if (mode.kind !== 'minigame' || mode.game.type !== 'catch' || !this.drawsField) return;
    const game = mode.game;

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

  /** Поле по центру экрана, увеличенное в целое число раз. */
  private fitCamera(): void {
    const camera = this.cameras.main;
    const zoom = Math.max(1, Math.floor(Math.min(camera.width / CATCH_FIELD.width, camera.height / (CATCH_FIELD.height + 40))));
    camera.setZoom(zoom);
    camera.centerOn(CATCH_FIELD.width / 2, CATCH_FIELD.height / 2);
  }
}
