import type { CardEffect } from '../content/types';
import type { AttackTarget, BattleState, CardBattle, Side, UnitState } from './cardBattle';
import { opponentOf } from './cardBattle';

export type AiAction =
  | { type: 'play'; handIndex: number; target?: AttackTarget }
  | { type: 'attack'; attackerUid: number; target: AttackTarget }
  | { type: 'endTurn' };

/** Эффект, который сейчас ничего не даст: лечить здорового героя, бить пустой стол и т.п. */
const isWasted = (effect: CardEffect, state: BattleState, side: Side): boolean => {
  const own = state.sides[side];
  const foe = state.sides[opponentOf(side)];
  switch (effect.type) {
    case 'healHero':
      return own.hero.health >= own.hero.maxHealth;
    case 'damageAllEnemies':
      return foe.board.length === 0;
    case 'buffAllies':
      return own.board.length === 0;
    case 'draw':
      return own.deck.length === 0;
    case 'damageEnemyHero':
    case 'damageTarget':
      return false;
    case 'buffTarget':
      return own.board.length === 0;
  }
};

/** Цель для заклинания: добить героя, убить самое опасное существо или усилить своё сильнейшее. */
const chooseSpellTarget = (battle: CardBattle, state: BattleState, side: Side, handIndex: number): AttackTarget | undefined => {
  const cardId = state.sides[side].hand[handIndex];
  if (cardId === undefined) return undefined;
  const card = battle.card(cardId);
  if (card.type !== 'spell') return undefined;
  const byAttack = (units: UnitState[]): UnitState[] => [...units].sort((a, b) => b.attack - a.attack);

  if (card.effect.type === 'buffTarget') {
    const best = byAttack(state.sides[side].board)[0];
    return best ? { type: 'unit', uid: best.uid } : undefined;
  }
  if (card.effect.type === 'damageTarget') {
    const { amount } = card.effect;
    const foe = state.sides[opponentOf(side)];
    if (foe.hero.health <= amount) return { type: 'hero' };
    const killable = byAttack(foe.board.filter((unit) => unit.health <= amount))[0];
    return killable ? { type: 'unit', uid: killable.uid } : { type: 'hero' };
  }
  return undefined;
};

/**
 * Простой жадный ИИ. Выбирает одно следующее действие: сначала разыгрывает самые дорогие
 * доступные карты (заклинания — только когда от них есть толк), затем атакует: добивает героя,
 * если урона хватает, иначе выгодно разменивается по существам или бьёт в героя. Затем передаёт ход.
 * Возвращает null, если сейчас не ход этой стороны или бой окончен.
 */
export const chooseAiAction = (battle: CardBattle, side: Side = 'enemy'): AiAction | null => {
  if (battle.winner || battle.active !== side) return null;
  const state = battle.snapshot();
  const own = state.sides[side];

  let bestIndex = -1;
  let bestCost = -1;
  own.hand.forEach((cardId, index) => {
    const card = battle.card(cardId);
    const cost = card.cost;
    if (card.type === 'spell' && isWasted(card.effect, state, side)) return;
    if (cost > bestCost && battle.canPlay(side, index).ok) {
      bestIndex = index;
      bestCost = cost;
    }
  });
  if (bestIndex >= 0) {
    const target = chooseSpellTarget(battle, state, side, bestIndex);
    return target ? { type: 'play', handIndex: bestIndex, target } : { type: 'play', handIndex: bestIndex };
  }

  const attacker = own.board.find((unit) => unit.canAttack && unit.attack > 0);
  if (attacker) {
    const foeBoard = state.sides[opponentOf(side)].board;
    const targets = battle.validTargets(side);
    const unitTargets = targets
      .filter((target): target is Extract<AttackTarget, { type: 'unit' }> => target.type === 'unit')
      .map((target) => foeBoard.find((unit) => unit.uid === target.uid))
      .filter((unit): unit is UnitState => unit !== undefined);
    const canHitHero = targets.some((target) => target.type === 'hero');
    const foeHero = state.sides[opponentOf(side)].hero;
    const readyDamage = own.board.reduce((sum, unit) => sum + (unit.canAttack ? unit.attack : 0), 0);
    // Хватает урона, чтобы закончить бой, — размены уже не нужны.
    if (canHitHero && readyDamage >= foeHero.health) {
      return { type: 'attack', attackerUid: attacker.uid, target: { type: 'hero' } };
    }
    const goodTrade = unitTargets.find((unit) => unit.health <= attacker.attack && unit.attack < attacker.health);
    const fallback = unitTargets[0];

    if (goodTrade) return { type: 'attack', attackerUid: attacker.uid, target: { type: 'unit', uid: goodTrade.uid } };
    if (canHitHero) return { type: 'attack', attackerUid: attacker.uid, target: { type: 'hero' } };
    if (fallback) return { type: 'attack', attackerUid: attacker.uid, target: { type: 'unit', uid: fallback.uid } };
  }

  return { type: 'endTurn' };
};

/** Выполняет одно действие ИИ. Возвращает его (или null, если действовать нельзя). */
export const performAiStep = (battle: CardBattle, side: Side = 'enemy'): AiAction | null => {
  const action = chooseAiAction(battle, side);
  if (!action) return null;
  if (action.type === 'play') battle.playCard(side, action.handIndex, action.target);
  else if (action.type === 'attack') battle.attack(side, action.attackerUid, action.target);
  else battle.endTurn(side);
  return action;
};

/** Весь ход ИИ целиком — для тестов и симуляций. */
export const playAiTurn = (battle: CardBattle, side: Side = 'enemy'): void => {
  // Ограничение на случай ошибки в правилах: ход не может длиться бесконечно.
  for (let step = 0; step < 100; step++) {
    const action = performAiStep(battle, side);
    if (!action || action.type === 'endTurn') return;
  }
};
