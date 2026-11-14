import type { Facing } from '../world/world';

/** Меняется при несовместимых правках формата; старые сохранения тогда отбрасываются. */
export const SAVE_VERSION = 1;

export interface QuestSave {
  id: string;
  status: 'active' | 'completed';
  /** id выполненных целей. */
  done: string[];
}

/**
 * Снимок прогресса — обычный JSON без ссылок на классы. Куда его положить
 * (localStorage, файл, бэкенд), решает слой платформы, а не ядро.
 */
export interface SaveData {
  version: typeof SAVE_VERSION;
  levelId: string;
  player: { x: number; y: number; facing: Facing };
  quests: QuestSave[];
  cards: { owned: Record<string, number>; deck: string[] };
  defeatedBosses: string[];
  wonMinigames: string[];
  /** Открытые сундуки в виде «уровень:объект». */
  openedChests: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isFacing = (value: unknown): value is Facing =>
  value === 'up' || value === 'down' || value === 'left' || value === 'right';

const parseQuest = (value: unknown): QuestSave | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || !isStringArray(value.done)) return null;
  if (value.status !== 'active' && value.status !== 'completed') return null;
  return { id: value.id, status: value.status, done: value.done };
};

/**
 * Проверяет произвольные данные (например, результат JSON.parse) и возвращает сохранение
 * либо null, если формат не подходит. Ссылки на контент здесь не проверяются — это делает
 * `GameSession.restore`, которому известен контент.
 */
export const parseSave = (raw: unknown): SaveData | null => {
  if (!isRecord(raw) || raw.version !== SAVE_VERSION || typeof raw.levelId !== 'string') return null;
  const { player, cards, quests } = raw;
  if (!isRecord(player) || !Number.isFinite(player.x) || !Number.isFinite(player.y) || !isFacing(player.facing)) return null;
  if (!isRecord(cards) || !isRecord(cards.owned) || !isStringArray(cards.deck)) return null;
  if (!Array.isArray(quests) || !isStringArray(raw.defeatedBosses) || !isStringArray(raw.wonMinigames)) return null;

  const owned: Record<string, number> = {};
  for (const [cardId, count] of Object.entries(cards.owned)) {
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) return null;
    owned[cardId] = count;
  }
  const parsedQuests: QuestSave[] = [];
  for (const item of quests) {
    const quest = parseQuest(item);
    if (!quest) return null;
    parsedQuests.push(quest);
  }

  return {
    version: SAVE_VERSION,
    levelId: raw.levelId,
    player: { x: Number(player.x), y: Number(player.y), facing: player.facing },
    quests: parsedQuests,
    cards: { owned, deck: cards.deck },
    defeatedBosses: raw.defeatedBosses,
    wonMinigames: raw.wonMinigames,
    // Поле появилось позже остальных: в старых сохранениях его нет.
    openedChests: isStringArray(raw.openedChests) ? raw.openedChests : [],
  };
};
