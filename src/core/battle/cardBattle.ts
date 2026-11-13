import type { CardDef, CardEffect, CardId, CardKeyword, EffectTargeting } from '../content/types';
import { effectTargeting } from '../content/types';
import type { Rng } from '../util/rng';
import { shuffle } from '../util/rng';

export type Side = 'player' | 'enemy';

export const opponentOf = (side: Side): Side => (side === 'player' ? 'enemy' : 'player');

export interface UnitState {
  /** Уникальный номер существа в рамках боя. */
  uid: number;
  cardId: CardId;
  name: string;
  attack: number;
  health: number;
  maxHealth: number;
  keywords: CardKeyword[];
  canAttack: boolean;
}

export interface HeroState {
  name: string;
  health: number;
  maxHealth: number;
}

export interface SideState {
  hero: HeroState;
  mana: number;
  maxMana: number;
  deck: CardId[];
  hand: CardId[];
  board: UnitState[];
  /** Растущий урон за попытку взять карту из пустой колоды — гарантирует, что бой закончится. */
  fatigue: number;
}

/** Последняя атака — чтобы интерфейс мог её анимировать. `seq` растёт с каждой атакой. */
export interface LastAttack {
  seq: number;
  side: Side;
  attackerUid: number;
  target: AttackTarget;
}

export interface BattleState {
  turn: number;
  active: Side;
  winner: Side | null;
  sides: Record<Side, SideState>;
  log: string[];
  lastAttack: LastAttack | null;
}

export type AttackTarget = { type: 'hero' } | { type: 'unit'; uid: number };

export type ActionResult = { ok: true } | { ok: false; reason: string };

export interface BattleRules {
  startingHand: number;
  manaCap: number;
  maxBoard: number;
  maxHand: number;
}

export const DEFAULT_BATTLE_RULES: BattleRules = {
  startingHand: 3,
  manaCap: 10,
  maxBoard: 5,
  maxHand: 8,
};

export interface BattleParticipant {
  name: string;
  health: number;
  deck: readonly CardId[];
}

export interface BattleConfig {
  resolveCard: (cardId: CardId) => CardDef;
  player: BattleParticipant;
  enemy: BattleParticipant;
  rng: Rng;
  rules?: Partial<BattleRules>;
}

const sameTarget = (a: AttackTarget, b: AttackTarget): boolean =>
  a.type === 'hero' ? b.type === 'hero' : b.type === 'unit' && a.uid === b.uid;

const ok: ActionResult = { ok: true };
const fail = (reason: string): ActionResult => ({ ok: false, reason });

/**
 * Движок карточного боя (заглушка MVP в духе Hearthstone):
 * мана растёт на 1 за ход, существа выкладываются на стол, атакуют существ или героя.
 * Чистая логика: ни UI, ни таймеров. Первым ходит игрок.
 */
export class CardBattle {
  readonly rules: BattleRules;
  private readonly state: BattleState;
  private readonly resolveCard: (cardId: CardId) => CardDef;
  private nextUid = 1;

  constructor(config: BattleConfig) {
    this.rules = { ...DEFAULT_BATTLE_RULES, ...config.rules };
    this.resolveCard = config.resolveCard;
    const side = (participant: BattleParticipant): SideState => ({
      hero: { name: participant.name, health: participant.health, maxHealth: participant.health },
      mana: 0,
      maxMana: 0,
      deck: shuffle(participant.deck, config.rng),
      hand: [],
      board: [],
      fatigue: 0,
    });
    this.state = {
      turn: 0,
      active: 'enemy',
      winner: null,
      sides: { player: side(config.player), enemy: side(config.enemy) },
      log: [],
      lastAttack: null,
    };
    for (let i = 0; i < this.rules.startingHand; i++) {
      this.draw('player');
      this.draw('enemy');
    }
    this.startTurn('player');
  }

  get active(): Side {
    return this.state.active;
  }

  get winner(): Side | null {
    return this.state.winner;
  }

  /** Глубокая копия состояния — безопасно отдавать в UI. */
  snapshot(): BattleState {
    const copySide = (side: SideState): SideState => ({
      ...side,
      hero: { ...side.hero },
      deck: [...side.deck],
      hand: [...side.hand],
      board: side.board.map((unit) => ({ ...unit, keywords: [...unit.keywords] })),
    });
    return {
      ...this.state,
      sides: { player: copySide(this.state.sides.player), enemy: copySide(this.state.sides.enemy) },
      log: [...this.state.log],
      lastAttack: this.state.lastAttack ? { ...this.state.lastAttack } : null,
    };
  }

  card(cardId: CardId): CardDef {
    return this.resolveCard(cardId);
  }

  /** Нужно ли указывать цель при розыгрыше карты и какую. */
  targetingOf(cardId: CardId): EffectTargeting {
    const card = this.resolveCard(cardId);
    return card.type === 'spell' ? effectTargeting(card.effect) : 'none';
  }

  /** Допустимые цели заклинания из руки; пустой список — цель не нужна или её нет. */
  validPlayTargets(side: Side, handIndex: number): AttackTarget[] {
    const cardId = this.state.sides[side].hand[handIndex];
    if (cardId === undefined) return [];
    const units = (owner: Side): AttackTarget[] =>
      this.state.sides[owner].board.map((unit) => ({ type: 'unit', uid: unit.uid }));
    switch (this.targetingOf(cardId)) {
      case 'enemy':
        return [{ type: 'hero' }, ...units(opponentOf(side))];
      case 'ally':
        return units(side);
      case 'none':
        return [];
    }
  }

  /**
   * Можно ли сыграть карту. Для заклинаний с целью: без `target` проверяется только,
   * что цели вообще есть; с `target` — что выбранная цель допустима.
   */
  canPlay(side: Side, handIndex: number, target?: AttackTarget): ActionResult {
    const guard = this.guardTurn(side);
    if (!guard.ok) return guard;
    const own = this.state.sides[side];
    const cardId = own.hand[handIndex];
    if (cardId === undefined) return fail('Нет такой карты в руке');
    const card = this.resolveCard(cardId);
    if (card.cost > own.mana) return fail('Не хватает маны');
    if (card.type === 'unit' && own.board.length >= this.rules.maxBoard) return fail('На столе нет места');
    if (this.targetingOf(cardId) !== 'none') {
      const targets = this.validPlayTargets(side, handIndex);
      if (targets.length === 0) return fail('Нет подходящей цели');
      if (target && !targets.some((candidate) => sameTarget(candidate, target))) return fail('Нет такой цели');
    }
    return ok;
  }

  playCard(side: Side, handIndex: number, target?: AttackTarget): ActionResult {
    const check = this.canPlay(side, handIndex, target);
    if (!check.ok) return check;
    const needsTarget = this.targetingOf(this.state.sides[side].hand[handIndex] as CardId) !== 'none';
    if (needsTarget && !target) return fail('Нужно выбрать цель');
    const own = this.state.sides[side];
    const [cardId] = own.hand.splice(handIndex, 1);
    const card = this.resolveCard(cardId as CardId);
    own.mana -= card.cost;
    if (card.type === 'spell') {
      this.log(`${own.hero.name}: заклинание «${card.name}»`);
      this.applyEffect(side, card.effect, target);
    } else {
      this.log(`${own.hero.name}: «${card.name}» выходит на стол`);
      // Эффект выхода срабатывает до появления существа: «усилить союзников» его самого не касается.
      if (card.onPlay) this.applyEffect(side, card.onPlay);
      own.board.push({
        uid: this.nextUid++,
        cardId: card.id,
        name: card.name,
        attack: card.attack,
        health: card.health,
        maxHealth: card.health,
        keywords: [...card.keywords],
        canAttack: card.keywords.includes('charge'),
      });
    }
    this.checkWinner();
    return ok;
  }

  /** Цели, которые существо вправе атаковать: при наличии защитников — только они. */
  validTargets(side: Side): AttackTarget[] {
    const foe = this.state.sides[opponentOf(side)];
    const guards = foe.board.filter((unit) => unit.keywords.includes('guard'));
    if (guards.length > 0) return guards.map((unit) => ({ type: 'unit', uid: unit.uid }));
    return [{ type: 'hero' }, ...foe.board.map((unit): AttackTarget => ({ type: 'unit', uid: unit.uid }))];
  }

  attack(side: Side, attackerUid: number, target: AttackTarget): ActionResult {
    const guard = this.guardTurn(side);
    if (!guard.ok) return guard;
    const own = this.state.sides[side];
    const foe = this.state.sides[opponentOf(side)];
    const attacker = own.board.find((unit) => unit.uid === attackerUid);
    if (!attacker) return fail('Нет такого существа');
    if (!attacker.canAttack) return fail('Это существо сейчас не может атаковать');
    if (attacker.attack <= 0) return fail('У существа нет атаки');

    const allowed = this.validTargets(side).some((candidate) => sameTarget(candidate, target));
    if (!allowed) {
      const exists = target.type === 'hero' || foe.board.some((unit) => unit.uid === target.uid);
      return fail(exists ? 'Сначала нужно атаковать защитника' : 'Нет такой цели');
    }

    attacker.canAttack = false;
    this.state.lastAttack = { seq: (this.state.lastAttack?.seq ?? 0) + 1, side, attackerUid, target };
    if (target.type === 'hero') {
      foe.hero.health -= attacker.attack;
      this.log(`«${attacker.name}» бьёт героя ${foe.hero.name} на ${attacker.attack}`);
    } else {
      const defender = foe.board.find((unit) => unit.uid === target.uid) as UnitState;
      defender.health -= attacker.attack;
      attacker.health -= defender.attack;
      this.log(`«${attacker.name}» атакует «${defender.name}»`);
      this.buryDead(side);
      this.buryDead(opponentOf(side));
    }
    this.checkWinner();
    return ok;
  }

  endTurn(side: Side): ActionResult {
    const guard = this.guardTurn(side);
    if (!guard.ok) return guard;
    this.startTurn(opponentOf(side));
    return ok;
  }

  private applyEffect(side: Side, effect: CardEffect, target?: AttackTarget): void {
    const own = this.state.sides[side];
    const foe = this.state.sides[opponentOf(side)];
    switch (effect.type) {
      case 'damageEnemyHero':
        foe.hero.health -= effect.amount;
        this.log(`Герой ${foe.hero.name} получает ${effect.amount} урона`);
        break;
      case 'healHero':
        own.hero.health = Math.min(own.hero.maxHealth, own.hero.health + effect.amount);
        this.log(`Герой ${own.hero.name} восстанавливает до ${effect.amount} здоровья`);
        break;
      case 'draw':
        for (let i = 0; i < effect.count; i++) this.draw(side);
        this.log(`${own.hero.name} берёт карты: ${effect.count}`);
        break;
      case 'damageAllEnemies':
        for (const unit of foe.board) unit.health -= effect.amount;
        this.log(`Все существа героя ${foe.hero.name} получают ${effect.amount} урона`);
        this.buryDead(opponentOf(side));
        break;
      case 'buffAllies':
        for (const unit of own.board) {
          unit.attack += effect.attack;
          unit.health += effect.health;
          unit.maxHealth += effect.health;
        }
        this.log(`Существа героя ${own.hero.name} получают +${effect.attack}/+${effect.health}`);
        break;
      case 'damageTarget': {
        const unit = target?.type === 'unit' ? foe.board.find((candidate) => candidate.uid === target.uid) : undefined;
        if (unit) {
          unit.health -= effect.amount;
          this.log(`«${unit.name}» получает ${effect.amount} урона`);
          this.buryDead(opponentOf(side));
        } else {
          foe.hero.health -= effect.amount;
          this.log(`Герой ${foe.hero.name} получает ${effect.amount} урона`);
        }
        break;
      }
      case 'buffTarget': {
        const unit = target?.type === 'unit' ? own.board.find((candidate) => candidate.uid === target.uid) : undefined;
        if (!unit) break;
        unit.attack += effect.attack;
        unit.health += effect.health;
        unit.maxHealth += effect.health;
        this.log(`«${unit.name}» получает +${effect.attack}/+${effect.health}`);
        break;
      }
    }
  }

  private guardTurn(side: Side): ActionResult {
    if (this.state.winner) return fail('Бой уже окончен');
    if (this.state.active !== side) return fail('Сейчас не ваш ход');
    return ok;
  }

  private startTurn(side: Side): void {
    const own = this.state.sides[side];
    this.state.active = side;
    this.state.turn += 1;
    own.maxMana = Math.min(this.rules.manaCap, own.maxMana + 1);
    own.mana = own.maxMana;
    for (const unit of own.board) unit.canAttack = true;
    this.draw(side);
    this.checkWinner();
  }

  private draw(side: Side): void {
    const own = this.state.sides[side];
    const cardId = own.deck.shift();
    if (cardId === undefined) {
      own.fatigue += 1;
      own.hero.health -= own.fatigue;
      this.log(`${own.hero.name}: колода пуста, усталость наносит ${own.fatigue}`);
      return;
    }
    // Лишняя карта при полной руке сгорает.
    if (own.hand.length < this.rules.maxHand) own.hand.push(cardId);
  }

  /** Убирает погибших существ стороны и запускает их эффекты гибели. */
  private buryDead(side: Side): void {
    const own = this.state.sides[side];
    const dead = own.board.filter((unit) => unit.health <= 0);
    if (dead.length === 0) return;
    own.board = own.board.filter((unit) => unit.health > 0);
    for (const unit of dead) {
      this.log(`«${unit.name}» погибает`);
      const card = this.resolveCard(unit.cardId);
      // Существо уже снято со стола, поэтому цепочка эффектов гибели конечна.
      if (card.type === 'unit' && card.onDeath) this.applyEffect(side, card.onDeath);
    }
  }

  private checkWinner(): void {
    if (this.state.winner) return;
    const { player, enemy } = this.state.sides;
    if (player.hero.health <= 0) this.state.winner = 'enemy';
    else if (enemy.hero.health <= 0) this.state.winner = 'player';
    if (this.state.winner) this.log(`Победитель: ${this.state.sides[this.state.winner].hero.name}`);
  }

  private log(message: string): void {
    this.state.log.push(message);
  }
}
