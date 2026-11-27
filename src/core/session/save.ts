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
  /** Открытые двери в виде «уровень:объект». */
  openedDoors: string[];
  /** Монеты, заработанные в мини-играх — тратятся у торговца. */
  coins: number;
  /** Уровни, для которых уже показана вступительная сцена из `story.ts`. */
  seenChapters: string[];
  /** Сколько раз игрок начинал New Game+ (0 — обычное первое прохождение). */
  newGamePlus: number;
  /** Проигрывал ли игрок хоть раз бой (сдача засчитывается) — для достижения «без поражений». */
  hasLostBattle: boolean;
  /** id достижений, которые уже засчитаны — не отбираются даже после New Game+. */
  unlockedAchievements: string[];
  /** Боссы, с которыми игрок хоть раз сражался (победа не нужна) — открывает бестиарий. */
  metBosses: string[];
  /** Найденные (купленные) артефакты — экипировка вне боя, не карты. */
  ownedArtifacts: string[];
  /** Экипирован максимум один артефакт за раз, или null. */
  equippedArtifactId: string | null;
  /** Свободные флаги истории — обычно следствие выбора в ветвящемся диалоге. */
  flags: string[];
  /** Репутация — растёт и падает от мелких поступков, меняет реакцию и цены у NPC. */
  reputation: number;
  /** Когда это сохранение последний раз записывалось (`Date.now()`) — для списка слотов. */
  savedAt: number;
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
    // Эти поля появились позже остальных: в старых сохранениях их нет.
    openedChests: isStringArray(raw.openedChests) ? raw.openedChests : [],
    openedDoors: isStringArray(raw.openedDoors) ? raw.openedDoors : [],
    coins: typeof raw.coins === 'number' && Number.isInteger(raw.coins) && raw.coins >= 0 ? raw.coins : 0,
    seenChapters: isStringArray(raw.seenChapters) ? raw.seenChapters : [],
    newGamePlus: typeof raw.newGamePlus === 'number' && Number.isInteger(raw.newGamePlus) && raw.newGamePlus >= 0 ? raw.newGamePlus : 0,
    hasLostBattle: raw.hasLostBattle === true,
    unlockedAchievements: isStringArray(raw.unlockedAchievements) ? raw.unlockedAchievements : [],
    metBosses: isStringArray(raw.metBosses) ? raw.metBosses : [],
    ownedArtifacts: isStringArray(raw.ownedArtifacts) ? raw.ownedArtifacts : [],
    equippedArtifactId: typeof raw.equippedArtifactId === 'string' ? raw.equippedArtifactId : null,
    flags: isStringArray(raw.flags) ? raw.flags : [],
    reputation: typeof raw.reputation === 'number' && Number.isInteger(raw.reputation) ? raw.reputation : 0,
    savedAt: typeof raw.savedAt === 'number' && Number.isFinite(raw.savedAt) ? raw.savedAt : 0,
  };
};
