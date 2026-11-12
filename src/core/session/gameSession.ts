import { playAiTurn } from '../battle/ai';
import type { ActionResult, AttackTarget } from '../battle/cardBattle';
import { CardBattle } from '../battle/cardBattle';
import { CardCollection } from '../cards/collection';
import { ContentRegistry } from '../content/registry';
import type { BossDef, CardId, Condition, Effect, GameContent, MinigameDef, QuestDef } from '../content/types';
import type { AnyMinigame } from '../minigames/minigame';
import { createMinigame } from '../minigames/minigame';
import type { ProgressEvent } from '../quests/questLog';
import { QuestLog } from '../quests/questLog';
import { Emitter } from '../util/emitter';
import type { Rng } from '../util/rng';
import { createRng } from '../util/rng';
import type { MoveInput } from '../world/world';
import { WorldState } from '../world/world';

export interface DialogState {
  speaker: string;
  lines: string[];
  index: number;
}

/** Текущая «сцена» игры. Рендер и UI переключаются, глядя на `kind`. */
export type Mode =
  | { kind: 'world' }
  | { kind: 'dialog'; dialog: DialogState }
  | { kind: 'minigame'; def: MinigameDef; game: AnyMinigame }
  | { kind: 'battle'; boss: BossDef; battle: CardBattle };

export type SessionEvent =
  | { type: 'modeChanged'; mode: Mode['kind'] }
  | { type: 'levelChanged'; levelId: string }
  | { type: 'dialogAdvanced' }
  | { type: 'questStarted'; quest: QuestDef }
  | { type: 'questUpdated'; quest: QuestDef }
  | { type: 'questCompleted'; quest: QuestDef }
  | { type: 'cardsGranted'; cardIds: CardId[] }
  | { type: 'minigameFinished'; minigameId: string; won: boolean }
  | { type: 'battleUpdated' }
  | { type: 'battleFinished'; bossId: string; won: boolean };

export interface SessionOptions {
  seed?: number;
}

const SYSTEM_SPEAKER = '';
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
  private readonly defeatedBosses = new Set<string>();
  private readonly wonMinigames = new Set<string>();
  private lastPortalKey: string | null = null;
  private readonly rng: Rng;

  constructor(content: GameContent, options: SessionOptions = {}) {
    this.content = new ContentRegistry(content);
    this.rng = createRng(options.seed ?? 1);
    this.world = new WorldState(this.content, content.player.startLevel);
    this.quests = new QuestLog(this.content.quest);
    this.cards = new CardCollection(content.deckRules, content.player.starterDeck);
  }

  get mode(): Mode {
    return this.currentMode;
  }

  /** Шаг игрового цикла. Вызывается рендером каждый кадр. */
  update(dtMs: number, input: MoveInput): void {
    const dt = Math.min(dtMs, MAX_STEP_MS);
    const mode = this.currentMode;
    if (mode.kind === 'world') {
      this.world.update(dt, input);
      this.checkPortal();
    } else if (mode.kind === 'minigame') {
      mode.game.update(dt, input);
      if (mode.game.status !== 'playing') this.finishMinigame(mode.def, mode.game.status === 'won');
    }
  }

  /** Кнопка действия: заговорить с NPC или пролистать диалог. */
  interact(): void {
    const mode = this.currentMode;
    if (mode.kind === 'dialog') {
      this.advanceDialog(mode.dialog);
      return;
    }
    if (mode.kind !== 'world') return;
    const placement = this.world.findInteractableNpc();
    if (!placement) return;
    const npc = this.content.npc(placement.npcId);
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

  // ---------- Карточный бой ----------

  battlePlayCard(handIndex: number): ActionResult {
    return this.battleAction((battle) => battle.playCard('player', handIndex));
  }

  battleAttack(attackerUid: number, target: AttackTarget): ActionResult {
    return this.battleAction((battle) => battle.attack('player', attackerUid, target));
  }

  /** Завершает ход игрока; противник отвечает сразу же. */
  battleEndTurn(): ActionResult {
    return this.battleAction((battle) => {
      const result = battle.endTurn('player');
      if (result.ok) playAiTurn(battle, 'enemy');
      return result;
    });
  }

  /** Закрывает экран боя после его окончания (или сдачи) и применяет итоги. */
  leaveBattle(): void {
    const mode = this.currentMode;
    if (mode.kind !== 'battle') return;
    const { boss, battle } = mode;
    const won = battle.winner === 'player';
    if (won && !this.defeatedBosses.has(boss.id)) {
      this.defeatedBosses.add(boss.id);
      this.grantCards(boss.rewardCards);
      this.progress({ type: 'bossDefeated', bossId: boss.id });
    }
    this.openDialog(boss.name, won ? boss.winLines : boss.loseLines, []);
  }

  // ---------- Внутреннее ----------

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
    this.pendingEffects = [];
    this.pendingTalk = null;
    this.setMode({ kind: 'world' });
    if (talkedTo) this.progress({ type: 'npcTalked', npcId: talkedTo });
    for (const effect of effects) this.apply(effect);
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
        this.setMode({ kind: 'minigame', def, game: createMinigame(def, this.rng) });
        break;
      }
      case 'startBattle': {
        const boss = this.content.boss(effect.bossId);
        const battle = new CardBattle({
          resolveCard: this.content.card,
          player: { name: 'Странник', health: this.content.data.player.heroHealth, deck: this.cards.deck },
          enemy: { name: boss.name, health: boss.health, deck: boss.deck },
          rng: this.rng,
        });
        this.setMode({ kind: 'battle', boss, battle });
        this.events.emit({ type: 'battleUpdated' });
        break;
      }
    }
  }

  private finishMinigame(def: MinigameDef, won: boolean): void {
    this.events.emit({ type: 'minigameFinished', minigameId: def.id, won });
    const lines = [won ? `Победа в мини-игре «${def.name}»!` : `«${def.name}»: не вышло. Попробуй ещё раз!`];
    if (won && !this.wonMinigames.has(def.id)) {
      this.wonMinigames.add(def.id);
      this.grantCards(def.rewardCards);
      this.progress({ type: 'minigameWon', minigameId: def.id });
    }
    this.openDialog(SYSTEM_SPEAKER, lines, []);
  }

  private grantCards(cardIds: CardId[]): void {
    if (cardIds.length === 0) return;
    for (const cardId of cardIds) this.cards.add(cardId);
    this.events.emit({ type: 'cardsGranted', cardIds });
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
    if (!this.check(portal.requires)) {
      this.openDialog(SYSTEM_SPEAKER, [portal.lockedText ?? 'Проход пока закрыт.'], []);
      return;
    }
    this.lastPortalKey = null;
    this.world.loadLevel(portal.toLevel, portal.toSpawn);
    this.events.emit({ type: 'levelChanged', levelId: portal.toLevel });
    this.progress({ type: 'levelEntered', levelId: portal.toLevel });
  }
}
