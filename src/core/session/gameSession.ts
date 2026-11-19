import { performAiStep } from '../battle/ai';
import type { ActionResult, AttackTarget } from '../battle/cardBattle';
import { CardBattle } from '../battle/cardBattle';
import { CardCollection } from '../cards/collection';
import { ContentRegistry } from '../content/registry';
import type {
  BossDef,
  CardId,
  Condition,
  Effect,
  GameContent,
  LevelId,
  MinigameDef,
  Point,
  QuestDef,
  TradeOffer,
  WorldObjectDef,
} from '../content/types';
import type { AnyMinigame } from '../minigames/minigame';
import { createMinigame } from '../minigames/minigame';
import type { ProgressEvent } from '../quests/questLog';
import { QuestLog } from '../quests/questLog';
import { Emitter } from '../util/emitter';
import type { Rng } from '../util/rng';
import { createRng } from '../util/rng';
import type { MoveInput } from '../world/world';
import type { SaveData } from './save';
import { SAVE_VERSION } from './save';
import { WorldState } from '../world/world';

export interface DialogState {
  speaker: string;
  lines: string[];
  index: number;
}

/**
 * Мини-игра начинается с вступления (правила и кнопка «Начать») — случайный запуск
 * ни к чему не обязывает. После исхода остаётся на экране итога, пока игрок не выйдет.
 */
export type MinigamePhase = 'intro' | 'playing' | 'finished';

/** Текущая «сцена» игры. Рендер и UI переключаются, глядя на `kind`. */
export type Mode =
  | { kind: 'world' }
  | { kind: 'dialog'; dialog: DialogState }
  | { kind: 'minigame'; def: MinigameDef; game: AnyMinigame; phase: MinigamePhase; wonBefore: boolean }
  | { kind: 'battle'; boss: BossDef; battle: CardBattle }
  /** Выбор одной карты из нескольких (сундук). */
  | { kind: 'reward'; title: string; options: CardId[]; chestKey: string | null; after?: () => void }
  /** Лавка торговца: можно купить любую из карт за монеты, пока не надоест. */
  | { kind: 'trade'; offers: TradeOffer[] }
  /** Финальная сцена после победы над боссом с `finale` — экран вместо обычного возврата в мир. */
  | { kind: 'finale'; title: string; lines: string[] }
  /** Глава из `story.ts`, показанная заставкой при первом входе в её уровень. */
  | { kind: 'scene'; title: string; text: string };

/** Подсказка о том, с чем сейчас можно взаимодействовать. */
export interface InteractionPrompt {
  verb: string;
  name: string;
  at: Point;
}

export type SessionEvent =
  | { type: 'modeChanged'; mode: Mode['kind'] }
  | { type: 'levelChanged'; levelId: string }
  | { type: 'dialogAdvanced' }
  | { type: 'questStarted'; quest: QuestDef }
  | { type: 'questUpdated'; quest: QuestDef }
  | { type: 'questCompleted'; quest: QuestDef }
  | { type: 'cardsGranted'; cardIds: CardId[] }
  | { type: 'coinsGranted'; amount: number }
  | { type: 'minigameStarted'; minigameId: string }
  | { type: 'minigameFinished'; minigameId: string; won: boolean }
  | { type: 'battleUpdated' }
  | { type: 'battleFinished'; bossId: string; won: boolean };

export interface SessionOptions {
  seed?: number;
}

const SYSTEM_SPEAKER = '';
/** Сколько копий каждой карты выдаёт отладочная команда «все карты». */
const CHEAT_COPIES = 2;
/** Монеты за победу в мини-игре — каждый раз, не только за первую. */
const MINIGAME_WIN_COINS = 10;
/** Ограничение шага, чтобы после «подвисшей» вкладки персонаж не пролетал сквозь стены. */
const MAX_STEP_MS = 50;

/**
 * Корень игровой логики: связывает мир, квесты, коллекцию карт, мини-игры и карточный бой.
 * Не знает о Vue, Phaser и DOM — слои представления подписываются на `events` и вызывают методы.
 */
export class GameSession {
  readonly content: ContentRegistry;
  readonly world: WorldState;
  readonly quests: QuestLog;
  readonly cards: CardCollection;
  readonly events = new Emitter<SessionEvent>();

  private currentMode: Mode = { kind: 'world' };
  private pendingEffects: Effect[] = [];
  private pendingTalk: string | null = null;
  private pendingFinale: { title: string; lines: string[] } | null = null;
  private readonly defeatedBosses = new Set<string>();
  private readonly wonMinigames = new Set<string>();
  private lastPortalKey: string | null = null;
  private portalsForcedOpen = false;
  private readonly openedChests = new Set<string>();
  /** Открытые двери в виде «уровень:объект» — как и сундуки, открываются насовсем. */
  private readonly openedDoors = new Set<string>();
  /** Уровни, для которых уже показана вступительная сцена — чтобы не повторять её. */
  private readonly seenChapters = new Set<LevelId>();
  /** Карты на выбор за только что выигранную мини-игру: предлагаются при выходе с экрана итога. */
  private pendingMinigameChoices: CardId[] | null = null;
  private readonly rng: Rng;
  private coinCount = 0;

  constructor(content: GameContent, options: SessionOptions = {}) {
    this.content = new ContentRegistry(content);
    this.rng = createRng(options.seed ?? 1);
    this.world = new WorldState(this.content, content.player.startLevel);
    this.quests = new QuestLog(this.content.quest);
    this.cards = new CardCollection(content.deckRules, content.player.starterDeck);
    this.syncDoors();
    this.showLevelScene(content.player.startLevel);
  }

  /** Если для этого уровня есть глава и она ещё не показывалась — открывает её заставкой. */
  private showLevelScene(levelId: LevelId): void {
    if (this.seenChapters.has(levelId)) return;
    const chapter = this.content.data.story.find((candidate) => candidate.levelId === levelId);
    if (!chapter) return;
    this.seenChapters.add(levelId);
    this.setMode({ kind: 'scene', title: chapter.title, text: chapter.text });
  }

  /**
   * Создаёт сессию из сохранения. Всё, чего в текущем контенте уже нет
   * (уровень, квест, карта), молча отбрасывается — старое сохранение не ломает игру.
   */
  static restore(content: GameContent, save: SaveData, options: SessionOptions = {}): GameSession {
    const session = new GameSession(content, options);
    const has = (table: Record<string, unknown>, id: string): boolean => Object.hasOwn(table, id);

    if (has(content.levels, save.levelId)) {
      session.world.loadLevel(save.levelId);
      session.world.placePlayer(save.player.x, save.player.y, save.player.facing);
    }
    session.quests.restore(save.quests.filter((quest) => has(content.quests, quest.id)));
    const owned = Object.fromEntries(Object.entries(save.cards.owned).filter(([cardId]) => has(content.cards, cardId)));
    session.cards.restore(owned, save.cards.deck.filter((cardId) => has(content.cards, cardId)));
    for (const id of save.defeatedBosses) if (has(content.bosses, id)) session.defeatedBosses.add(id);
    for (const id of save.wonMinigames) if (has(content.minigames, id)) session.wonMinigames.add(id);
    for (const key of save.openedChests) session.openedChests.add(key);
    for (const key of save.openedDoors) session.openedDoors.add(key);
    for (const id of save.seenChapters) session.seenChapters.add(id);
    session.syncDoors();
    session.coinCount = save.coins;
    // Сохранение всегда возвращает в мир — вступительная сцена из конструктора тут лишняя.
    session.setMode({ kind: 'world' });
    return session;
  }

  /**
   * Снимок прогресса. Мини-игра и бой не сохраняются: их итоги попадают в прогресс
   * только по завершении, так что загрузка вернёт игрока в мир перед ними.
   */
  serialize(): SaveData {
    const { x, y, facing } = this.world.player;
    return {
      version: SAVE_VERSION,
      levelId: this.world.level.id,
      player: { x, y, facing },
      quests: this.quests.snapshot(),
      cards: {
        owned: Object.fromEntries(this.cards.list().map(({ cardId, count }) => [cardId, count])),
        deck: [...this.cards.deck],
      },
      defeatedBosses: [...this.defeatedBosses],
      wonMinigames: [...this.wonMinigames],
      openedChests: [...this.openedChests],
      openedDoors: [...this.openedDoors],
      coins: this.coinCount,
      seenChapters: [...this.seenChapters],
    };
  }

  get mode(): Mode {
    return this.currentMode;
  }

  get coins(): number {
    return this.coinCount;
  }

  /** Шаг игрового цикла. Вызывается рендером каждый кадр. */
  update(dtMs: number, input: MoveInput): void {
    const dt = Math.min(dtMs, MAX_STEP_MS);
    const mode = this.currentMode;
    if (mode.kind === 'world') {
      this.world.update(dt, input);
      this.checkPortal();
    } else if (mode.kind === 'minigame' && mode.phase === 'playing') {
      mode.game.update(dt, input);
      if (mode.game.status !== 'playing') this.finishMinigame(mode);
    }
  }

  /** Кнопка действия: заговорить с NPC, пролистать диалог, начать мини-игру или выйти с её итога. */
  interact(): void {
    const mode = this.currentMode;
    if (mode.kind === 'minigame') {
      if (mode.phase === 'intro') this.startMinigame();
      else if (mode.phase === 'finished') this.quitMinigame();
      return;
    }
    if (mode.kind === 'dialog') {
      this.advanceDialog(mode.dialog);
      return;
    }
    if (mode.kind !== 'world') return;
    const target = this.world.findInteractable();
    if (!target) return;
    if (target.kind === 'object') {
      this.useObject(target.object);
      return;
    }
    const npc = this.content.npc(target.npc.npcId);
    const script = npc.scripts.find((candidate) => this.check(candidate.when));
    if (!script) return;
    this.pendingTalk = npc.id;
    this.openDialog(npc.name, script.lines, script.effects ?? []);
  }

  check(conditions: Condition[] | undefined): boolean {
    return (conditions ?? []).every((condition) => {
      switch (condition.type) {
        case 'questStatus':
          return this.quests.status(condition.questId) === condition.status;
        case 'bossDefeated':
          return this.defeatedBosses.has(condition.bossId) === condition.value;
      }
    });
  }

  /** С чем игрок может взаимодействовать прямо сейчас (для подсказки и значка над целью). */
  interactionPrompt(): InteractionPrompt | null {
    if (this.currentMode.kind !== 'world') return null;
    const target = this.world.findInteractable();
    if (!target) return null;
    if (target.kind === 'npc') {
      return { verb: 'поговорить', name: this.content.npc(target.npc.npcId).name, at: target.npc.at };
    }
    const { object } = target;
    switch (object.type) {
      case 'sign':
        return { verb: 'прочитать', name: 'Табличка', at: object.at };
      case 'chest':
        return this.isChestOpened(object.id) ? null : { verb: 'открыть', name: 'Сундук', at: object.at };
      case 'lever':
        return this.isLeverPulled(object) ? null : { verb: 'потянуть', name: 'Рычаг', at: object.at };
      case 'door':
        // Дверь не объект взаимодействия — findInteractable её не предлагает.
        return null;
    }
  }

  /** Открыт ли сундук на текущем уровне. */
  isChestOpened(objectId: string): boolean {
    return this.openedChests.has(this.chestKey(objectId));
  }

  /** Открыта ли дверь на текущем уровне (по id объекта). */
  isDoorOpen(objectId: string): boolean {
    return this.world.isDoorOpen(objectId);
  }

  /** Рычаг уже потянут, если все двери, которые он открывает, уже открыты. */
  private isLeverPulled(lever: Extract<WorldObjectDef, { type: 'lever' }>): boolean {
    return lever.opens.every((doorId) => this.world.isDoorOpen(doorId));
  }

  /** Забрать одну из предложенных карт; сундук после этого пуст. */
  chooseReward(index: number): void {
    const mode = this.currentMode;
    if (mode.kind !== 'reward') return;
    const cardId = mode.options[index];
    if (cardId === undefined) return;
    if (mode.chestKey) this.openedChests.add(mode.chestKey);
    this.setMode({ kind: 'world' });
    this.grantCards([cardId]);
    mode.after?.();
  }

  /** Закрыть выбор, ничего не взяв: сундук останется закрытым. Награду за победу отклонить нельзя. */
  declineReward(): void {
    const mode = this.currentMode;
    if (mode.kind === 'reward' && mode.chestKey) this.setMode({ kind: 'world' });
  }

  // ---------- Мини-игры ----------

  /** Из вступления — в игру. */
  startMinigame(): void {
    const mode = this.currentMode;
    if (mode.kind !== 'minigame' || mode.phase !== 'intro') return;
    mode.phase = 'playing';
    this.events.emit({ type: 'minigameStarted', minigameId: mode.def.id });
  }

  /** Начать ту же мини-игру заново — с любого её экрана. */
  restartMinigame(): void {
    const mode = this.currentMode;
    if (mode.kind !== 'minigame') return;
    mode.game = createMinigame(mode.def, this.rng);
    mode.phase = 'playing';
    mode.wonBefore = this.wonMinigames.has(mode.def.id);
    this.events.emit({ type: 'minigameStarted', minigameId: mode.def.id });
  }

  /** Выйти в мир с любого экрана мини-игры. Уже полученные награды и прогресс остаются. */
  quitMinigame(): void {
    if (this.currentMode.kind !== 'minigame') return;
    const choices = this.pendingMinigameChoices;
    this.pendingMinigameChoices = null;
    if (choices) this.setMode({ kind: 'reward', title: 'Награда за победу', options: choices, chestKey: null });
    else this.setMode({ kind: 'world' });
  }

  hasWonMinigame(minigameId: string): boolean {
    return this.wonMinigames.has(minigameId);
  }

  // ---------- Отладка ----------
  // Команды для разработки и тестирования; интерфейс показывает их только в режиме отладки.

  /** Засчитать победу в идущей мини-игре. */
  cheatWinMinigame(): void {
    const mode = this.currentMode;
    if (mode.kind !== 'minigame' || mode.phase === 'finished') return;
    mode.game.status = 'won';
    this.finishMinigame(mode);
  }

  /** Засчитать победу в идущем бою (противник «сдаётся»). */
  cheatWinBattle(): void {
    this.battleAction((battle) => battle.concede('enemy'));
  }

  /** Выдать недостающие копии всех карт игры. */
  cheatGrantAllCards(): void {
    const missing: CardId[] = [];
    for (const cardId of Object.keys(this.content.data.cards)) {
      for (let count = this.cards.count(cardId); count < CHEAT_COPIES; count++) missing.push(cardId);
    }
    this.grantCards(missing);
  }

  /** Завершить все активные квесты с выдачей наград. */
  cheatCompleteQuests(): void {
    for (const quest of this.quests.completeActive()) {
      this.events.emit({ type: 'questCompleted', quest });
      this.grantCards(quest.rewardCards);
    }
  }

  /** Открыть (или снова закрыть) все порталы независимо от условий. */
  cheatSetPortalsOpen(open: boolean): void {
    this.portalsForcedOpen = open;
  }

  get cheatPortalsOpen(): boolean {
    return this.portalsForcedOpen;
  }

  /** Перенестись на уровень, как через портал. Работает только из мира. */
  cheatTeleport(levelId: string): void {
    if (this.currentMode.kind !== 'world') return;
    this.world.loadLevel(levelId);
    this.syncDoors();
    this.lastPortalKey = null;
    this.events.emit({ type: 'levelChanged', levelId });
    this.progress({ type: 'levelEntered', levelId });
  }

  // ---------- Карточный бой ----------

  battlePlayCard(handIndex: number, target?: AttackTarget): ActionResult {
    return this.battleAction((battle) => battle.playCard('player', handIndex, target));
  }

  battleAttack(attackerUid: number, target: AttackTarget): ActionResult {
    return this.battleAction((battle) => battle.attack('player', attackerUid, target));
  }

  /** Замена стартовой руки: индексы карт, которые игрок хочет сбросить (можно пустой список). */
  battleMulligan(handIndexes: readonly number[]): ActionResult {
    return this.battleAction((battle) => battle.mulligan(handIndexes));
  }

  battleUsePower(target?: AttackTarget): ActionResult {
    return this.battleAction((battle) => battle.usePower('player', target));
  }

  /** Завершает ход игрока. Дальше ход противника по шагам ведёт `battleEnemyStep`. */
  battleEndTurn(): ActionResult {
    return this.battleAction((battle) => battle.endTurn('player'));
  }

  /**
   * Одно действие противника (карта, атака или конец хода). UI вызывает его с паузами,
   * чтобы игрок видел, что происходит. Возвращает true, пока ход противника продолжается.
   */
  battleEnemyStep(): boolean {
    const mode = this.currentMode;
    if (mode.kind !== 'battle' || mode.battle.winner || mode.battle.active !== 'enemy') return false;
    this.battleAction((battle) => {
      performAiStep(battle, 'enemy', mode.boss.ai ?? 'basic');
      return { ok: true };
    });
    return mode.battle.winner === null && mode.battle.active === 'enemy';
  }

  /** Закрывает экран боя после его окончания (или сдачи) и применяет итоги. */
  leaveBattle(): void {
    const mode = this.currentMode;
    if (mode.kind !== 'battle') return;
    const { boss, battle } = mode;
    const won = battle.winner === 'player';
    if (won && boss.finale) this.pendingFinale = boss.finale;
    if (won && !this.defeatedBosses.has(boss.id)) {
      this.defeatedBosses.add(boss.id);
      this.grantCards(boss.rewardCards);
      this.progress({ type: 'bossDefeated', bossId: boss.id });
      const choices = boss.rewardChoices ?? [];
      if (choices.length > 0) {
        this.setMode({
          kind: 'reward',
          title: 'Награда за победу',
          options: choices,
          chestKey: null,
          after: () => this.openDialog(boss.name, boss.winLines, []),
        });
        return;
      }
    }
    this.openDialog(boss.name, won ? boss.winLines : boss.loseLines, []);
  }

  // ---------- Внутреннее ----------

  private chestKey(objectId: string): string {
    return `${this.world.level.id}:${objectId}`;
  }

  private doorKey(objectId: string): string {
    return `${this.world.level.id}:${objectId}`;
  }

  /** Отмечает в `WorldState` текущего уровня, какие его двери уже были открыты раньше. */
  private syncDoors(): void {
    const open = (this.world.level.objects ?? [])
      .filter((object): object is Extract<WorldObjectDef, { type: 'door' }> => object.type === 'door')
      .filter((object) => this.openedDoors.has(this.doorKey(object.id)))
      .map((object) => object.id);
    this.world.setOpenDoors(new Set(open));
  }

  private useObject(object: WorldObjectDef): void {
    switch (object.type) {
      case 'sign':
        this.openDialog('Табличка', object.lines, []);
        return;
      case 'chest':
        if (this.isChestOpened(object.id)) return;
        this.setMode({ kind: 'reward', title: 'Сундук', options: object.choices, chestKey: this.chestKey(object.id) });
        return;
      case 'lever':
        if (this.isLeverPulled(object)) return;
        for (const doorId of object.opens) {
          this.openedDoors.add(this.doorKey(doorId));
          this.world.openDoor(doorId);
        }
        this.openDialog('Рычаг', ['Со скрежетом дверь отъезжает в сторону.'], []);
        return;
      case 'door':
        return;
    }
  }

  private battleAction(action: (battle: CardBattle) => ActionResult): ActionResult {
    const mode = this.currentMode;
    if (mode.kind !== 'battle') return { ok: false, reason: 'Бой не идёт' };
    const hadWinner = mode.battle.winner !== null;
    const result = action(mode.battle);
    this.events.emit({ type: 'battleUpdated' });
    if (!hadWinner && mode.battle.winner) {
      this.events.emit({ type: 'battleFinished', bossId: mode.boss.id, won: mode.battle.winner === 'player' });
    }
    return result;
  }

  private setMode(mode: Mode): void {
    const changed = mode.kind !== this.currentMode.kind;
    this.currentMode = mode;
    if (changed) this.events.emit({ type: 'modeChanged', mode: mode.kind });
  }

  private openDialog(speaker: string, lines: string[], effects: Effect[]): void {
    this.pendingEffects = effects;
    this.setMode({ kind: 'dialog', dialog: { speaker, lines, index: 0 } });
    this.events.emit({ type: 'dialogAdvanced' });
  }

  private advanceDialog(dialog: DialogState): void {
    if (dialog.index < dialog.lines.length - 1) {
      dialog.index += 1;
      this.events.emit({ type: 'dialogAdvanced' });
      return;
    }
    const effects = this.pendingEffects;
    const talkedTo = this.pendingTalk;
    const finale = this.pendingFinale;
    this.pendingEffects = [];
    this.pendingTalk = null;
    this.pendingFinale = null;
    this.setMode(finale ? { kind: 'finale', ...finale } : { kind: 'world' });
    if (talkedTo) this.progress({ type: 'npcTalked', npcId: talkedTo });
    for (const effect of effects) this.apply(effect);
  }

  /** Закрыть финальную сцену и вернуться в мир — игру можно продолжать и после титров. */
  leaveFinale(): void {
    if (this.currentMode.kind === 'finale') this.setMode({ kind: 'world' });
  }

  private apply(effect: Effect): void {
    switch (effect.type) {
      case 'startQuest':
        if (this.quests.start(effect.questId)) {
          this.events.emit({ type: 'questStarted', quest: this.content.quest(effect.questId) });
          // Цель «войти на уровень» засчитывается, если игрок уже там.
          this.progress({ type: 'levelEntered', levelId: this.world.level.id });
        }
        break;
      case 'grantCards':
        this.grantCards(effect.cardIds);
        break;
      case 'startMinigame': {
        const def = this.content.minigame(effect.minigameId);
        this.setMode({
          kind: 'minigame',
          def,
          game: createMinigame(def, this.rng),
          phase: 'intro',
          wonBefore: this.wonMinigames.has(def.id),
        });
        break;
      }
      case 'startBattle': {
        const boss = this.content.boss(effect.bossId);
        const { player } = this.content.data;
        const battle = new CardBattle({
          resolveCard: this.content.card,
          player: { name: 'Странник', health: player.heroHealth, deck: this.cards.deck, ...(player.power ? { power: player.power } : {}) },
          enemy: { name: boss.name, health: boss.health, deck: boss.deck, ...(boss.power ? { power: boss.power } : {}) },
          rng: this.rng,
          mulligan: true,
        });
        this.setMode({ kind: 'battle', boss, battle });
        this.events.emit({ type: 'battleUpdated' });
        break;
      }
      case 'openTrade':
        this.setMode({ kind: 'trade', offers: effect.offers });
        break;
    }
  }

  /** Фиксирует исход: награды и прогресс выдаются сразу, игрок остаётся на экране итога. */
  private finishMinigame(mode: Extract<Mode, { kind: 'minigame' }>): void {
    const { def } = mode;
    const won = mode.game.status === 'won';
    mode.phase = 'finished';
    this.events.emit({ type: 'minigameFinished', minigameId: def.id, won });
    if (won) this.addCoins(MINIGAME_WIN_COINS);
    if (won && !this.wonMinigames.has(def.id)) {
      this.wonMinigames.add(def.id);
      this.grantCards(def.rewardCards);
      if (def.rewardChoices?.length) this.pendingMinigameChoices = [...def.rewardChoices];
      this.progress({ type: 'minigameWon', minigameId: def.id });
    }
  }

  /** Купить карту у торговца за монеты — пока в лавке, можно взять сколько угодно. */
  buyCard(index: number): ActionResult {
    const mode = this.currentMode;
    if (mode.kind !== 'trade') return { ok: false, reason: 'Лавка закрыта' };
    const offer = mode.offers[index];
    if (!offer) return { ok: false, reason: 'Нет такого товара' };
    if (offer.price > this.coinCount) return { ok: false, reason: 'Не хватает монет' };
    this.coinCount -= offer.price;
    this.grantCards([offer.cardId]);
    return { ok: true };
  }

  /** Закрыть лавку и вернуться в мир. */
  leaveTrade(): void {
    if (this.currentMode.kind === 'trade') this.setMode({ kind: 'world' });
  }

  private grantCards(cardIds: CardId[]): void {
    if (cardIds.length === 0) return;
    for (const cardId of cardIds) this.cards.add(cardId);
    this.events.emit({ type: 'cardsGranted', cardIds });
  }

  private addCoins(amount: number): void {
    this.coinCount += amount;
    this.events.emit({ type: 'coinsGranted', amount });
  }

  private progress(event: ProgressEvent): void {
    const { updated, completed } = this.quests.handle(event);
    for (const quest of updated) this.events.emit({ type: 'questUpdated', quest });
    for (const quest of completed) {
      this.events.emit({ type: 'questCompleted', quest });
      this.grantCards(quest.rewardCards);
    }
  }

  private checkPortal(): void {
    const portal = this.world.portalUnderPlayer();
    if (!portal) {
      this.lastPortalKey = null;
      return;
    }
    const key = `${this.world.level.id}:${portal.at.x}:${portal.at.y}`;
    if (key === this.lastPortalKey) return;
    this.lastPortalKey = key;
    if (!this.portalsForcedOpen && !this.check(portal.requires)) {
      this.openDialog(SYSTEM_SPEAKER, [portal.lockedText ?? 'Проход пока закрыт.'], []);
      return;
    }
    this.lastPortalKey = null;
    this.world.loadLevel(portal.toLevel, portal.toSpawn);
    this.syncDoors();
    this.events.emit({ type: 'levelChanged', levelId: portal.toLevel });
    this.progress({ type: 'levelEntered', levelId: portal.toLevel });
    this.showLevelScene(portal.toLevel);
  }

  /** Закрыть вступительную сцену уровня и вернуться в мир. */
  leaveScene(): void {
    if (this.currentMode.kind === 'scene') this.setMode({ kind: 'world' });
  }
}
