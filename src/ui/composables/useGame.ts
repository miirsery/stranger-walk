import type { Ref, ShallowRef } from 'vue';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { gameContent } from '@content/index';
import type { BattleState } from '@core/battle/cardBattle';
import type { ArtifactOffer, MinigameDef, TradeOffer } from '@core/content/types';
import type { QuestView } from '@core/quests/questLog';
import type { DialogState, MinigamePhase, Mode, SessionEvent } from '@core/session/gameSession';
import { GameSession } from '@core/session/gameSession';
import { attachAudio } from '@/audio/audioDirector';
import { audio } from '@/audio/chiptune';
import { InputHub } from '@/input/inputHub';
import type { SaveStorage } from '@/platform/saveStorage';
import type { GameHandle } from '@/render/createGame';
import { setCrashContext } from '../errorReporting';
import { TEXT_SPEED_CPS, useSettingsStore } from '../stores/settings';

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
  /** Текст текущей реплики, показанный на текущий момент анимации (зависит от настройки «Скорость текста»). */
  dialogRevealedText: Ref<string>;
  /** false, пока реплика ещё «печатается» — в этот момент действие доигрывает её целиком, не продвигая диалог. */
  dialogFullyRevealed: Ref<boolean>;
  /** Доиграть текущую реплику до конца, не дожидаясь анимации. */
  revealDialogNow: () => void;
  battle: ShallowRef<BattleState | null>;
  quests: ShallowRef<QuestView[]>;
  cardTotal: Ref<number>;
  deckSize: Ref<number>;
  coins: Ref<number>;
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
  rewardOptions: ShallowRef<{ title: string; options: string[]; canDecline: boolean } | null>;
  /** Открытая лавка торговца, или null. */
  tradeOffers: ShallowRef<TradeOffer[] | null>;
  tradeArtifactOffers: ShallowRef<ArtifactOffer[] | null>;
  /** Финальная сцена после победы над последним боссом, или null. */
  finale: ShallowRef<{ title: string; lines: string[] } | null>;
  /** Вступительная сцена уровня (глава из журнала при первом входе), или null. */
  scene: ShallowRef<{ title: string; text: string } | null>;
  /** Записать прогресс прямо сейчас (помимо автосохранения). */
  saveNow: () => void;
  /** Момент последней записи (`Date.now()`) — для индикатора автосохранения; null, пока не сохранялись ни разу. */
  lastSavedAt: Ref<number | null>;
}

export type GamePanel = 'deck' | 'journal';

export interface GameOptions {
  storage: SaveStorage;
  /** true — продолжить с сохранения, false — начать заново. */
  continueGame: boolean;
  /** Какой из слотов сохранения используется. */
  slot: number;
  /** id из `gameContent.starterDecks` — какую колоду выбрал игрок для новой игры. */
  starterDeckId?: string;
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
  const { storage, slot } = options;
  const save = options.continueGame ? storage.load(slot) : null;
  const seed = Date.now();
  const starterDeck = gameContent.starterDecks.find((deck) => deck.id === options.starterDeckId)?.cards;
  const session = save ? GameSession.restore(gameContent, save, { seed }) : new GameSession(gameContent, { seed, starterDeck });
  const input = new InputHub();
  const settings = useSettingsStore();
  watch(() => settings.keyBindings, (bindings) => input.setKeyBindings(bindings), { immediate: true, deep: true });
  watch(() => settings.padActionButton, (index) => input.setPadActionButton(index), { immediate: true });

  const modeKind = ref<Mode['kind']>('world');
  const minigameType = ref<MinigameDef['type'] | null>(null);
  const minigamePhase = ref<MinigamePhase | null>(null);
  const loading = ref(true);
  const levelName = ref('');
  const dialog = shallowRef<DialogState | null>(null);
  const dialogRevealedChars = ref(0);
  const dialogFullyRevealed = ref(true);
  const battle = shallowRef<BattleState | null>(null);
  const quests = shallowRef<QuestView[]>([]);
  const cardTotal = ref(0);
  const deckSize = ref(0);
  const coins = ref(0);
  const toasts = ref<Toast[]>([]);
  const paused = ref(false);
  const panel = ref<GamePanel | null>(null);
  const interactTarget = ref<{ verb: string; name: string } | null>(null);
  const rewardOptions = shallowRef<{ title: string; options: string[]; canDecline: boolean } | null>(null);
  const tradeOffers = shallowRef<TradeOffer[] | null>(null);
  const tradeArtifactOffers = shallowRef<ArtifactOffer[] | null>(null);
  const finale = shallowRef<{ title: string; lines: string[] } | null>(null);
  const scene = shallowRef<{ title: string; text: string } | null>(null);
  const lastSavedAt = ref<number | null>(null);

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

  /** Текст текущей реплики целиком (не зависит от анимации показа). */
  const currentDialogText = (): string => {
    const current = dialog.value;
    return current ? (current.lines[current.index] ?? '') : '';
  };

  let dialogRevealFrame = 0;
  let dialogRevealLastTime = 0;

  const stopDialogReveal = (): void => {
    if (dialogRevealFrame) cancelAnimationFrame(dialogRevealFrame);
    dialogRevealFrame = 0;
  };

  /** Доиграть текущую реплику до конца, не дожидаясь анимации — один и тот же путь для клика и для кнопки действия. */
  const revealDialogNow = (): void => {
    stopDialogReveal();
    dialogRevealedChars.value = currentDialogText().length;
    dialogFullyRevealed.value = true;
  };

  /** Запускает анимацию «печати» текущей реплики заново — зовётся при каждой новой реплике. */
  const startDialogReveal = (): void => {
    stopDialogReveal();
    const text = currentDialogText();
    const charsPerSecond = TEXT_SPEED_CPS[settings.textSpeed];
    if (!Number.isFinite(charsPerSecond) || text.length === 0) {
      dialogRevealedChars.value = text.length;
      dialogFullyRevealed.value = true;
      return;
    }
    dialogRevealedChars.value = 0;
    dialogFullyRevealed.value = false;
    dialogRevealLastTime = performance.now();
    const tick = (time: number): void => {
      const dtSeconds = (time - dialogRevealLastTime) / 1000;
      dialogRevealLastTime = time;
      dialogRevealedChars.value = Math.min(text.length, dialogRevealedChars.value + dtSeconds * charsPerSecond);
      if (dialogRevealedChars.value >= text.length) {
        dialogFullyRevealed.value = true;
        dialogRevealFrame = 0;
      } else {
        dialogRevealFrame = requestAnimationFrame(tick);
      }
    };
    dialogRevealFrame = requestAnimationFrame(tick);
  };

  const dialogRevealedText = computed(() => currentDialogText().slice(0, Math.floor(dialogRevealedChars.value)));

  const refresh = (): void => {
    const mode = session.mode;
    // Последнее известное состояние игры — попадёт в отчёт, если дальше что-то упадёт (см. crash.ts).
    setCrashContext({ levelId: session.world.level.id, mode: mode.kind, newGamePlus: session.newGamePlus });
    modeKind.value = mode.kind;
    minigameType.value = mode.kind === 'minigame' ? mode.def.type : null;
    minigamePhase.value = mode.kind === 'minigame' ? mode.phase : null;
    levelName.value = session.world.level.name;
    const previousDialog = dialog.value;
    dialog.value = mode.kind === 'dialog' ? { ...mode.dialog } : null;
    const next = dialog.value;
    if (!next) stopDialogReveal();
    else if (!previousDialog || previousDialog.index !== next.index || previousDialog.lines !== next.lines) startDialogReveal();
    battle.value = mode.kind === 'battle' ? mode.battle.snapshot() : null;
    rewardOptions.value = mode.kind === 'reward' ? { title: mode.title, options: [...mode.options], canDecline: mode.chestKey !== null } : null;
    tradeOffers.value = mode.kind === 'trade' ? [...mode.offers] : null;
    tradeArtifactOffers.value = mode.kind === 'trade' ? [...mode.artifactOffers] : null;
    finale.value = mode.kind === 'finale' ? { title: mode.title, lines: [...mode.lines] } : null;
    scene.value = mode.kind === 'scene' ? { title: mode.title, text: mode.text } : null;
    quests.value = session.quests.list();
    cardTotal.value = session.cards.total;
    deckSize.value = session.cards.deck.length;
    coins.value = session.coins;
  };

  // Снимок не содержит состояния боя и мини-игры, поэтому сохранять можно в любой момент:
  // загрузка вернёт игрока в мир со всеми уже полученными наградами.
  const saveNow = (): void => {
    storage.save(slot, session.serialize());
    lastSavedAt.value = Date.now();
  };

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
    if (event.type === 'coinsGranted') toast(`Получено монет: ${event.amount}`);
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
      stopDialogReveal();
    });
    cleanups.push(session.events.on(onEvent));
    cleanups.push(input.attachKeyboard(window));
    cleanups.push(input.attachGamepad(() => navigator.getGamepads()));
    cleanups.push(
      input.onAction(() => {
        if (paused.value || panel.value !== null) return;
        // Пока реплика ещё «печатается», кнопка действия сперва доигрывает её целиком — и для клавиатуры, и для клика.
        if (modeKind.value === 'dialog' && !dialogFullyRevealed.value) revealDialogNow();
        else session.interact();
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

  return {
    session,
    input,
    modeKind,
    minigameType,
    minigamePhase,
    loading,
    levelName,
    dialog,
    dialogRevealedText,
    dialogFullyRevealed,
    revealDialogNow,
    battle,
    quests,
    cardTotal,
    deckSize,
    coins,
    toasts,
    paused,
    panel,
    setPaused,
    setPanel,
    refresh,
    interactTarget,
    rewardOptions,
    tradeOffers,
    tradeArtifactOffers,
    finale,
    scene,
    saveNow,
    lastSavedAt,
  };
};
