import type * as Phaser from 'phaser';
import type { GameSession } from '@core/session/gameSession';
import type { InputHub } from '@/input/inputHub';

/** Всё, что сценам нужно от внешнего мира. Кладётся в `game.registry`. */
export interface RenderContext {
  session: GameSession;
  input: InputHub;
  /** Пауза (меню паузы во Vue): сцены перестают обновлять сессию. */
  paused: boolean;
}

const KEY = 'renderContext';

export const setRenderContext = (game: Phaser.Game, context: RenderContext): void => {
  game.registry.set(KEY, context);
};

export const getRenderContext = (scene: Phaser.Scene): RenderContext => scene.registry.get(KEY) as RenderContext;

export const SCENE_KEYS = { world: 'world', minigame: 'minigame' } as const;
