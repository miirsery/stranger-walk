/**
 * Модель данных контента. Всё, что описывает игру (сеттинги, уровни, NPC, квесты,
 * карты, боссы, мини-игры, музыка), задаётся данными этих типов в `src/content`.
 * Движок (`src/core`) и рендер читают данные и не содержат знаний о конкретном контенте.
 */

export type SettingId = string;
export type LevelId = string;
export type NpcId = string;
export type QuestId = string;
export type CardId = string;
export type BossId = string;
export type MinigameId = string;
export type TrackId = string;

/** Координаты в тайлах. */
export interface Point {
  x: number;
  y: number;
}

// ---------- Сеттинги и уровни ----------

/** Узор, которым рендер рисует тайл-заглушку, пока нет настоящих спрайтов. */
export type TilePattern = 'flat' | 'speckle' | 'bricks' | 'waves' | 'planks' | 'grid' | 'stars' | 'door';

export interface TileDef {
  name: string;
  solid: boolean;
  /** Цвета в формате 0xRRGGBB. */
  color: number;
  accent: number;
  pattern: TilePattern;
}

export interface SettingDef {
  id: SettingId;
  name: string;
  description: string;
  backgroundColor: number;
  music: TrackId;
  /** Второй трек того же сеттинга — при входе в его мир выбирается один из двух наугад. */
  musicAlt?: TrackId;
  /** Ключ — один символ, которым тайл обозначается в `LevelDef.rows`. */
  tiles: Record<string, TileDef>;
}

/** Цвета процедурного спрайта персонажа. */
export interface SpriteLook {
  body: number;
  skin: number;
  hat: number;
}

export type QuestStatus = 'inactive' | 'active' | 'completed';

/** Условия, по которым выбираются реплики NPC и открываются порталы. */
export type Condition =
  | { type: 'questStatus'; questId: QuestId; status: QuestStatus }
  | { type: 'bossDefeated'; bossId: BossId; value: boolean };

/** Предложение торговца: карта за столько-то монет. */
export interface TradeOffer {
  cardId: CardId;
  price: number;
}

/** Действия, которые запускаются после диалога. */
export type Effect =
  | { type: 'startQuest'; questId: QuestId }
  | { type: 'startMinigame'; minigameId: MinigameId }
  | { type: 'startBattle'; bossId: BossId }
  | { type: 'grantCards'; cardIds: CardId[] }
  | { type: 'openTrade'; offers: TradeOffer[] };

export interface NpcScript {
  /** Все условия должны выполняться. Без условий — сценарий подходит всегда. */
  when?: Condition[];
  lines: string[];
  effects?: Effect[];
}

export interface NpcDef {
  id: NpcId;
  name: string;
  look: SpriteLook;
  /** Выбирается первый сценарий, условия которого выполнены. */
  scripts: NpcScript[];
}

export interface NpcPlacement {
  npcId: NpcId;
  at: Point;
  /** Точки маршрута после `at` — NPC обходит их по очереди и возвращается назад (туда-обратно). */
  patrol?: Point[];
}

export interface PortalDef {
  at: Point;
  toLevel: LevelId;
  toSpawn: Point;
  requires?: Condition[];
  /** Что сказать игроку, если портал ещё закрыт. */
  lockedText?: string;
}

/**
 * Объекты на уровне, с которыми можно взаимодействовать. Как и NPC, они непроходимы.
 * Табличка показывает текст; сундук один раз предлагает выбрать одну карту из нескольких;
 * дверь перекрывает проход, пока рычаг, который её открывает, не потянут (это необратимо).
 */
export type WorldObjectDef = { id: string; at: Point } & (
  | { type: 'sign'; lines: string[] }
  | { type: 'chest'; choices: CardId[] }
  | { type: 'door' }
  | { type: 'lever'; opens: string[] }
);

export interface LevelDef {
  id: LevelId;
  name: string;
  setting: SettingId;
  /** Карта: строки одинаковой длины, каждый символ — ключ из `SettingDef.tiles`. */
  rows: string[];
  spawn: Point;
  npcs: NpcPlacement[];
  portals: PortalDef[];
  objects?: WorldObjectDef[];
}

// ---------- Квесты ----------

interface ObjectiveBase {
  id: string;
  text: string;
}

export type ObjectiveDef = ObjectiveBase &
  (
    | { type: 'talkTo'; npcId: NpcId }
    | { type: 'winMinigame'; minigameId: MinigameId }
    | { type: 'enterLevel'; levelId: LevelId }
    | { type: 'defeatBoss'; bossId: BossId }
  );

export interface QuestDef {
  id: QuestId;
  title: string;
  description: string;
  objectives: ObjectiveDef[];
  rewardCards: CardId[];
}

// ---------- Карты, колоды, боссы ----------

export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * guard — враг обязан атаковать это существо первым; charge — атакует в ход розыгрыша;
 * poison — убивает любое существо, которому нанёс урон; shield — гасит первый полученный удар.
 */
export type CardKeyword = 'guard' | 'charge' | 'poison' | 'shield';

/**
 * Эффекты карт. Большинство срабатывает без выбора цели; `damageTarget` и `buffTarget`
 * требуют цель и потому допустимы только у заклинаний (см. `effectTargeting`).
 */
export type CardEffect =
  | { type: 'damageEnemyHero'; amount: number }
  | { type: 'healHero'; amount: number }
  | { type: 'draw'; count: number }
  /** Урон всем существам противника. */
  | { type: 'damageAllEnemies'; amount: number }
  /** Усиление всех своих существ, уже стоящих на столе. */
  | { type: 'buffAllies'; attack: number; health: number }
  /** Урон выбранной цели: существу врага или его герою. Защитники заклинанию не мешают. */
  | { type: 'damageTarget'; amount: number }
  /** Усиление выбранного своего существа. */
  | { type: 'buffTarget'; attack: number; health: number };

/** Кого нужно указать при розыгрыше: никого, врага (существо или героя) или своё существо. */
export type EffectTargeting = 'none' | 'enemy' | 'ally';

export const effectTargeting = (effect: CardEffect): EffectTargeting => {
  if (effect.type === 'damageTarget') return 'enemy';
  if (effect.type === 'buffTarget') return 'ally';
  return 'none';
};

interface CardBase {
  id: CardId;
  name: string;
  cost: number;
  rarity: CardRarity;
  setting: SettingId;
  text: string;
}

/** Существо: остаётся на столе и атакует. */
export interface UnitCardDef extends CardBase {
  type: 'unit';
  attack: number;
  health: number;
  keywords: CardKeyword[];
  /** Необязательный эффект в момент выхода на стол (без выбора цели). */
  onPlay?: CardEffect;
  /** Необязательный эффект в момент гибели существа (без выбора цели). */
  onDeath?: CardEffect;
  /** Аура: пока существо на столе, остальные существа его стороны получают бонус к атаке. */
  aura?: { attack: number };
}

/** Заклинание: срабатывает один раз и уходит. */
export interface SpellCardDef extends CardBase {
  type: 'spell';
  effect: CardEffect;
}

export type CardDef = UnitCardDef | SpellCardDef;

/** Сила героя: способность, доступная раз в ход за ману. У каждого босса своя. */
export interface HeroPowerDef {
  name: string;
  text: string;
  cost: number;
  effect: CardEffect;
}

export interface DeckRules {
  minSize: number;
  maxSize: number;
  maxCopies: number;
}

/** Дополнительная награда на выбор: игрок берёт одну карту из списка (после фиксированных наград). */
export interface ChoiceReward {
  rewardChoices?: CardId[];
}

/** basic — жадный выбор хода; smart — перебирает варианты хода и оценивает итог. */
export type AiLevel = 'basic' | 'smart';

export interface BossDef extends ChoiceReward {
  id: BossId;
  name: string;
  title: string;
  setting: SettingId;
  health: number;
  deck: CardId[];
  power?: HeroPowerDef;
  ai?: AiLevel;
  music: TrackId;
  rewardCards: CardId[];
  winLines: string[];
  loseLines: string[];
  /** Показывается отдельным экраном после диалога победы — финал игры, если этот босс последний. */
  finale?: { title: string; lines: string[] };
}

// ---------- Мини-игры ----------

export interface CatchMinigameDef extends ChoiceReward {
  id: MinigameId;
  type: 'catch';
  name: string;
  instructions: string;
  durationMs: number;
  targetScore: number;
  spawnIntervalMs: number;
  /** Скорость падения в условных пикселях поля в секунду. */
  fallSpeed: number;
  /** Доля опасных предметов, 0..1. */
  hazardChance: number;
  maxMisses: number;
  music: TrackId;
  rewardCards: CardId[];
}

/** «Найди пару»: на поле по две копии каждой карты из `cards`. */
export interface MemoryMinigameDef extends ChoiceReward {
  id: MinigameId;
  type: 'memory';
  name: string;
  instructions: string;
  cards: CardId[];
  maxMistakes: number;
  /** Сколько миллисекунд несовпавшая пара остаётся открытой. */
  revealMs: number;
  music: TrackId;
  rewardCards: CardId[];
}

/** Новые типы мини-игр добавляются в это объединение (и в фабрику `createMinigame`). */
export type MinigameDef = CatchMinigameDef | MemoryMinigameDef;

// ---------- Музыка ----------

/**
 * Трек для чиптюн-синтезатора. Партии — ноты через пробел («C4», «F#3»),
 * «-» — пауза. Каждая нота длится один шаг (шестнадцатую).
 */
export interface MusicTrackDef {
  id: TrackId;
  bpm: number;
  lead: string;
  bass: string;
  /** Ударные: «K» — бас-бочка, «S» — малый, «H» — хай-хэт, «-» — пауза. Синтезируются из шума. */
  drums: string;
}

// ---------- Игрок, сюжет, корень ----------

export interface PlayerDef {
  look: SpriteLook;
  /** Скорость в пикселях мира в секунду. */
  speed: number;
  heroHealth: number;
  power?: HeroPowerDef;
  startLevel: LevelId;
  starterDeck: CardId[];
}

export interface StoryChapter {
  title: string;
  text: string;
  /** Если задано — глава показывается заставкой при первом входе в этот уровень. */
  levelId?: LevelId;
}

export interface HintDef {
  title: string;
  text: string;
}

export interface GameContent {
  player: PlayerDef;
  deckRules: DeckRules;
  settings: Record<SettingId, SettingDef>;
  levels: Record<LevelId, LevelDef>;
  npcs: Record<NpcId, NpcDef>;
  quests: Record<QuestId, QuestDef>;
  cards: Record<CardId, CardDef>;
  bosses: Record<BossId, BossDef>;
  minigames: Record<MinigameId, MinigameDef>;
  music: Record<TrackId, MusicTrackDef>;
  story: StoryChapter[];
  hints: HintDef[];
}
