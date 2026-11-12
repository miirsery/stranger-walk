import type { CardDef, CardId, CardKeyword } from '../content/types';
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

export interface BattleState {
  turn: number;
  active: Side;
  winner: Side | null;
  sides: Record<Side, SideState>;
  log: string[];
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
    };
  }

  card(cardId: CardId): CardDef {
    return this.resolveCard(cardId);
  }

  canPlay(side: Side, handIndex: number): ActionResult {
    const guard = this.guardTurn(side);
    if (!guard.ok) return guard;
    const own = this.state.sides[side];
    const cardId = own.hand[handIndex];
    if (cardId === undefined) return fail('Нет такой карты в руке');
    if (this.resolveCard(cardId).cost > own.mana) return fail('Не хватает маны');
    if (own.board.length >= this.rules.maxBoard) return fail('На столе нет места');
    return ok;
  }

  playCard(side: Side, handIndex: number): ActionResult {
    const check = this.canPlay(side, handIndex);
    if (!check.ok) return check;
    const own = this.state.sides[side];
    const [cardId] = own.hand.splice(handIndex, 1);
    const card = this.resolveCard(cardId as CardId);
    own.mana -= card.cost;
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
    this.log(`${own.hero.name}: «${card.name}» выходит на стол`);
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

    const allowed = this.validTargets(side).some(
      (candidate) =>
        candidate.type === target.type &&
        (candidate.type === 'hero' || (target.type === 'unit' && candidate.uid === target.uid)),
    );
    if (!allowed) {
      const exists = target.type === 'hero' || foe.board.some((unit) => unit.uid === target.uid);
      return fail(exists ? 'Сначала нужно атаковать защитника' : 'Нет такой цели');
    }

    attacker.canAttack = false;
    if (target.type === 'hero') {
      foe.hero.health -= attacker.attack;
      this.log(`«${attacker.name}» бьёт героя ${foe.hero.name} на ${attacker.attack}`);
    } else {
      const defender = foe.board.find((unit) => unit.uid === target.uid) as UnitState;
      defender.health -= attacker.attack;
      attacker.health -= defender.attack;
      this.log(`«${attacker.name}» атакует «${defender.name}»`);
      this.buryDead(own);
      this.buryDead(foe);
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

  private buryDead(side: SideState): void {
    for (const unit of side.board) {
      if (unit.health <= 0) this.log(`«${unit.name}» погибает`);
    }
    side.board = side.board.filter((unit) => unit.health > 0);
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
