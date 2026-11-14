import type { Ref, ShallowRef } from 'vue';
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { gameContent } from '@content/index';
import type { BattleState } from '@core/battle/cardBattle';
import type { MinigameDef } from '@core/content/types';
import type { QuestView } from '@core/quests/questLog';
import type { DialogState, MinigamePhase, Mode, SessionEvent } from '@core/session/gameSession';
import { GameSession } from '@core/session/gameSession';
import { attachAudio } from '@/audio/audioDirector';
import { audio } from '@/audio/chiptune';
import { InputHub } from '@/input/inputHub';
import type { SaveStorage } from '@/platform/saveStorage';
import type { GameHandle } from '@/render/createGame';

export interface Toast {
  id: number;
  text: string;
}

export interface GameBridge {
  session: GameSession;
  input: InputHub;
  modeKind: Ref<Mode['kind']>;
  /** Тип идущей мини-игры — UI решает, что рисовать поверх канваса. */
  minigameType: Ref<MinigameDef['type'] | null>;
  minigamePhase: Ref<MinigamePhase | null>;
  /** true, пока движок загружается и мир ещё не отрисован. */
  loading: Ref<boolean>;
  levelName: Ref<string>;
  dialog: ShallowRef<DialogState | null>;
  battle: ShallowRef<BattleState | null>;
  quests: ShallowRef<QuestView[]>;
  cardTotal: Ref<number>;
  deckSize: Ref<number>;
  toasts: Ref<Toast[]>;
  paused: Ref<boolean>;
  /** Открытая поверх мира панель: редактор колоды или журнал. */
  panel: Ref<GamePanel | null>;
  setPaused: (value: boolean) => void;
  /** Открыть панель или закрыть текущую (null). Панели доступны только в мире. */
  setPanel: (value: GamePanel | null) => void;
  refresh: () => void;
  /** С чем сейчас можно взаимодействовать (персонаж, табличка, сундук), или null. */
  interactTarget: Ref<{ verb: string; name: string } | null>;
  /** Карты, из которых предлагается выбрать одну (сундук), или null. */
  rewardOptions: ShallowRef<{ title: string; options: string[] } | null>;
  /** Записать прогресс прямо сейчас (помимо автосохранения). */
  saveNow: () => void;
}

export type GamePanel = 'deck' | 'journal';

export interface GameOptions {
  storage: SaveStorage;
  /** true — продолжить с сохранения, false — начать заново. */
  continueGame: boolean;
}

const TOAST_MS = 4000;
const LOADER_FALLBACK_MS = 8000;
/** Позиция игрока дозаписывается с таким интервалом; важные события сохраняются сразу. */
const AUTOSAVE_MS = 5000;

/**
 * Мост между ядром игры и Vue: создаёт сессию, запускает рендер и звук,
 * а состояние сессии отражает в реактивные ссылки для компонентов.
 */
export const useGame = (container: Ref<HTMLElement | null>, options: GameOptions): GameBridge => {
  const { storage } = options;
  const save = options.continueGame ? storage.load() : null;
  const seed = Date.now();
  const session = save ? GameSession.restore(gameContent, save, { seed }) : new GameSession(gameContent, { seed });
  const input = new InputHub();

  const modeKind = ref<Mode['kind']>('world');
  const minigameType = ref<MinigameDef['type'] | null>(null);
  const minigamePhase = ref<MinigamePhase | null>(null);
  const loading = ref(true);
  const levelName = ref('');
  const dialog = shallowRef<DialogState | null>(null);
  const battle = shallowRef<BattleState | null>(null);
  const quests = shallowRef<QuestView[]>([]);
  const cardTotal = ref(0);
  const deckSize = ref(0);
  const toasts = ref<Toast[]>([]);
  const paused = ref(false);
  const panel = ref<GamePanel | null>(null);
  const interactTarget = ref<{ verb: string; name: string } | null>(null);
  const rewardOptions = shallowRef<{ title: string; options: string[] } | null>(null);

  let handle: GameHandle | null = null;
  let nextToastId = 1;
  const cleanups: (() => void)[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const toast = (text: string): void => {
    const id = nextToastId++;
    toasts.value = [...toasts.value, { id, text }];
    const timer = setTimeout(() => {
      toasts.value = toasts.value.filter((item) => item.id !== id);
      timers.delete(timer);
    }, TOAST_MS);
    timers.add(timer);
  };

  const refresh = (): void => {
    const mode = session.mode;
    modeKind.value = mode.kind;
    minigameType.value = mode.kind === 'minigame' ? mode.def.type : null;
    minigamePhase.value = mode.kind === 'minigame' ? mode.phase : null;
    levelName.value = session.world.level.name;
    dialog.value = mode.kind === 'dialog' ? { ...mode.dialog } : null;
    battle.value = mode.kind === 'battle' ? mode.battle.snapshot() : null;
    rewardOptions.value = mode.kind === 'reward' ? { title: mode.title, options: [...mode.options] } : null;
    quests.value = session.quests.list();
    cardTotal.value = session.cards.total;
    deckSize.value = session.cards.deck.length;
  };

  // Снимок не содержит состояния боя и мини-игры, поэтому сохранять можно в любой момент:
  // загрузка вернёт игрока в мир со всеми уже полученными наградами.
  const saveNow = (): void => storage.save(session.serialize());

  let hintFrame = 0;
  const watchInteraction = (): void => {
    const prompt = session.interactionPrompt();
    const current = interactTarget.value;
    if (prompt?.verb !== current?.verb || prompt?.name !== current?.name) {
      interactTarget.value = prompt ? { verb: prompt.verb, name: prompt.name } : null;
    }
    hintFrame = requestAnimationFrame(watchInteraction);
  };

  const onEvent = (event: SessionEvent): void => {
    refresh();
    if (event.type !== 'dialogAdvanced' && event.type !== 'battleUpdated') saveNow();
    if (event.type === 'questStarted') toast(`Новый квест: ${event.quest.title}`);
    if (event.type === 'questCompleted') toast(`Квест выполнен: ${event.quest.title}`);
    if (event.type === 'cardsGranted') {
      const names = event.cardIds.map((id) => session.content.card(id).name).join(', ');
      toast(`Получены карты: ${names}`);
    }
  };

  // Мир замирает и на паузе, и пока открыта панель.
  const syncPause = (): void => handle?.setPaused(paused.value || panel.value !== null);

  const setPaused = (value: boolean): void => {
    paused.value = value;
    syncPause();
  };

  const setPanel = (value: GamePanel | null): void => {
    if (value && (session.mode.kind !== 'world' || paused.value)) return;
    if (panel.value === 'deck') saveNow();
    panel.value = value;
    syncPause();
  };

  onMounted(async () => {
    // Только в dev-сборке: доступ к сессии из консоли браузера для отладки.
    if (import.meta.env.DEV) Reflect.set(globalThis, '__session', session);
    refresh();
    saveNow();
    watchInteraction();
    const autosave = setInterval(saveNow, AUTOSAVE_MS);
    window.addEventListener('pagehide', saveNow);
    cleanups.push(() => {
      clearInterval(autosave);
      window.removeEventListener('pagehide', saveNow);
      cancelAnimationFrame(hintFrame);
    });
    cleanups.push(session.events.on(onEvent));
    cleanups.push(input.attachKeyboard(window));
    cleanups.push(input.attachGamepad(() => navigator.getGamepads()));
    cleanups.push(
      input.onAction(() => {
        if (!paused.value && panel.value === null) session.interact();
      }),
    );
    audio.unlock();
    cleanups.push(attachAudio(session, audio));

    const { createGame } = await import('@/render/createGame');
    // Компонент могли размонтировать, пока грузился чанк с Phaser.
    if (!container.value) return;
    handle = createGame(container.value, session, input, () => {
      loading.value = false;
    });
    // Страховка: если кадр так и не отрисовался (вкладка в фоне), не держим игрока на загрузке вечно.
    const fallback = setTimeout(() => {
      loading.value = false;
    }, LOADER_FALLBACK_MS);
    cleanups.push(() => clearTimeout(fallback));
    syncPause();
  });

  onBeforeUnmount(() => {
    saveNow();
    for (const cleanup of cleanups) cleanup();
    for (const timer of timers) clearTimeout(timer);
    handle?.destroy();
    handle = null;
    session.events.clear();
    audio.playTrack(null);
  });

  return { session, input, modeKind, minigameType, minigamePhase, loading, levelName, dialog, battle, quests, cardTotal, deckSize, toasts, paused, panel, setPaused, setPanel, refresh, interactTarget, rewardOptions, saveNow };
};
