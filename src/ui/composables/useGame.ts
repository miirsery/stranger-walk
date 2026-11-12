import type { Ref, ShallowRef } from 'vue';
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { gameContent } from '@content/index';
import type { BattleState } from '@core/battle/cardBattle';
import type { QuestView } from '@core/quests/questLog';
import type { DialogState, Mode, SessionEvent } from '@core/session/gameSession';
import { GameSession } from '@core/session/gameSession';
import { attachAudio } from '@/audio/audioDirector';
import { audio } from '@/audio/chiptune';
import { InputHub } from '@/input/inputHub';
import type { GameHandle } from '@/render/createGame';

export interface Toast {
  id: number;
  text: string;
}

export interface GameBridge {
  session: GameSession;
  input: InputHub;
  modeKind: Ref<Mode['kind']>;
  levelName: Ref<string>;
  dialog: ShallowRef<DialogState | null>;
  battle: ShallowRef<BattleState | null>;
  quests: ShallowRef<QuestView[]>;
  cardTotal: Ref<number>;
  deckSize: Ref<number>;
  toasts: Ref<Toast[]>;
  paused: Ref<boolean>;
  deckOpen: Ref<boolean>;
  setPaused: (value: boolean) => void;
  /** Открыть или закрыть редактор колоды (доступен только в мире). */
  setDeckOpen: (value: boolean) => void;
  refresh: () => void;
}

const TOAST_MS = 4000;

/**
 * Мост между ядром игры и Vue: создаёт сессию, запускает рендер и звук,
 * а состояние сессии отражает в реактивные ссылки для компонентов.
 */
export const useGame = (container: Ref<HTMLElement | null>): GameBridge => {
  const session = new GameSession(gameContent, { seed: Date.now() });
  const input = new InputHub();

  const modeKind = ref<Mode['kind']>('world');
  const levelName = ref('');
  const dialog = shallowRef<DialogState | null>(null);
  const battle = shallowRef<BattleState | null>(null);
  const quests = shallowRef<QuestView[]>([]);
  const cardTotal = ref(0);
  const deckSize = ref(0);
  const toasts = ref<Toast[]>([]);
  const paused = ref(false);
  const deckOpen = ref(false);

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
    levelName.value = session.world.level.name;
    dialog.value = mode.kind === 'dialog' ? { ...mode.dialog } : null;
    battle.value = mode.kind === 'battle' ? mode.battle.snapshot() : null;
    quests.value = session.quests.list();
    cardTotal.value = session.cards.total;
    deckSize.value = session.cards.deck.length;
  };

  const onEvent = (event: SessionEvent): void => {
    refresh();
    if (event.type === 'questStarted') toast(`Новый квест: ${event.quest.title}`);
    if (event.type === 'questCompleted') toast(`Квест выполнен: ${event.quest.title}`);
    if (event.type === 'cardsGranted') {
      const names = event.cardIds.map((id) => session.content.card(id).name).join(', ');
      toast(`Получены карты: ${names}`);
    }
  };

  // Мир замирает и на паузе, и пока открыт редактор колоды.
  const syncPause = (): void => handle?.setPaused(paused.value || deckOpen.value);

  const setPaused = (value: boolean): void => {
    paused.value = value;
    syncPause();
  };

  const setDeckOpen = (value: boolean): void => {
    if (value && (session.mode.kind !== 'world' || paused.value)) return;
    deckOpen.value = value;
    syncPause();
  };

  onMounted(async () => {
    // Только в dev-сборке: доступ к сессии из консоли браузера для отладки.
    if (import.meta.env.DEV) Reflect.set(globalThis, '__session', session);
    refresh();
    cleanups.push(session.events.on(onEvent));
    cleanups.push(input.attachKeyboard(window));
    cleanups.push(
      input.onAction(() => {
        if (!paused.value && !deckOpen.value) session.interact();
      }),
    );
    audio.unlock();
    cleanups.push(attachAudio(session, audio));

    const { createGame } = await import('@/render/createGame');
    // Компонент могли размонтировать, пока грузился чанк с Phaser.
    if (!container.value) return;
    handle = createGame(container.value, session, input);
    syncPause();
  });

  onBeforeUnmount(() => {
    for (const cleanup of cleanups) cleanup();
    for (const timer of timers) clearTimeout(timer);
    handle?.destroy();
    handle = null;
    session.events.clear();
    audio.playTrack(null);
  });

  return { session, input, modeKind, levelName, dialog, battle, quests, cardTotal, deckSize, toasts, paused, deckOpen, setPaused, setDeckOpen, refresh };
};
