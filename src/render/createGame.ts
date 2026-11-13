import * as Phaser from 'phaser';
import type { GameSession, SessionEvent } from '@core/session/gameSession';
import type { InputHub } from '@/input/inputHub';
import type { RenderContext } from './context';
import { SCENE_KEYS, setRenderContext } from './context';
import { MinigameScene } from './scenes/MinigameScene';
import { WorldScene } from './scenes/WorldScene';

/**
 * Минимальное внутреннее разрешение: экран масштабируется от него в целое число раз.
 * В портретной ориентации стороны меняются местами — иначе на телефоне мир получается мелким.
 */
const BASE_LONG = 320;
const BASE_SHORT = 180;

export interface GameHandle {
  setPaused(paused: boolean): void;
  destroy(): void;
}

/** Целочисленный масштаб и размер игрового поля, заполняющий контейнер без дробных пикселей. */
export const computeViewport = (width: number, height: number): { zoom: number; width: number; height: number } => {
  const landscape = width >= height;
  const baseWidth = landscape ? BASE_LONG : BASE_SHORT;
  const baseHeight = landscape ? BASE_SHORT : BASE_LONG;
  const zoom = Math.max(1, Math.floor(Math.min(width / baseWidth, height / baseHeight)));
  return { zoom, width: Math.max(1, Math.floor(width / zoom)), height: Math.max(1, Math.floor(height / zoom)) };
};

/**
 * Запускает Phaser внутри переданного элемента и связывает его с сессией.
 * Единственное место, где Phaser встречается с остальным приложением.
 */
/** Событие, которым сцена мира сообщает, что карта построена. */
export const WORLD_READY_EVENT = 'world-ready';

export const createGame = (
  parent: HTMLElement,
  session: GameSession,
  input: InputHub,
  onReady?: () => void,
): GameHandle => {
  const context: RenderContext = { session, input, paused: false };
  const initial = computeViewport(parent.clientWidth, parent.clientHeight);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: initial.width,
    height: initial.height,
    backgroundColor: '#14121f',
    // Пиксельная графика: без сглаживания, с округлением координат.
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: { mode: Phaser.Scale.NONE, zoom: initial.zoom, autoRound: true },
    // Звук и ввод идут через собственные слои (src/audio, src/input).
    audio: { noAudio: true },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    banner: false,
    callbacks: {
      preBoot: (instance) => setRenderContext(instance, context),
    },
    scene: [WorldScene, MinigameScene],
  });

  // «Готово» — когда мир построен и первый кадр с ним уже на экране.
  if (onReady) {
    game.events.once(WORLD_READY_EVENT, () => game.events.once(Phaser.Core.Events.POST_RENDER, onReady));
  }

  const resize = (): void => {
    const viewport = computeViewport(parent.clientWidth, parent.clientHeight);
    game.scale.setZoom(viewport.zoom);
    game.scale.resize(viewport.width, viewport.height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(parent);

  // Переключение сцен рендера по режиму сессии. Диалог и карточный бой рисует Vue поверх мира.
  const unsubscribe = session.events.on((event: SessionEvent) => {
    if (event.type !== 'modeChanged') return;
    const scenes = game.scene;
    if (event.mode === 'minigame') {
      scenes.sleep(SCENE_KEYS.world);
      scenes.run(SCENE_KEYS.minigame);
    } else if (scenes.isActive(SCENE_KEYS.minigame)) {
      scenes.stop(SCENE_KEYS.minigame);
      scenes.wake(SCENE_KEYS.world);
    }
  });

  return {
    setPaused: (paused) => {
      context.paused = paused;
    },
    destroy: () => {
      unsubscribe();
      observer.disconnect();
      game.destroy(true);
    },
  };
};
