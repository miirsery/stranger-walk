import type { AttackTarget, CardBattle, Side, UnitState } from './cardBattle';
import { opponentOf } from './cardBattle';

export type AiAction =
  | { type: 'play'; handIndex: number }
  | { type: 'attack'; attackerUid: number; target: AttackTarget }
  | { type: 'endTurn' };

/**
 * Простой жадный ИИ. Выбирает одно следующее действие: сначала разыгрывает самые дорогие
 * доступные карты, затем атакует (выгодные размены по существам, иначе в героя), затем передаёт ход.
 * Возвращает null, если сейчас не ход этой стороны или бой окончен.
 */
export const chooseAiAction = (battle: CardBattle, side: Side = 'enemy'): AiAction | null => {
  if (battle.winner || battle.active !== side) return null;
  const state = battle.snapshot();
  const own = state.sides[side];

  let bestIndex = -1;
  let bestCost = -1;
  own.hand.forEach((cardId, index) => {
    const cost = battle.card(cardId).cost;
    if (cost > bestCost && battle.canPlay(side, index).ok) {
      bestIndex = index;
      bestCost = cost;
    }
  });
  if (bestIndex >= 0) return { type: 'play', handIndex: bestIndex };

  const attacker = own.board.find((unit) => unit.canAttack && unit.attack > 0);
  if (attacker) {
    const foeBoard = state.sides[opponentOf(side)].board;
    const targets = battle.validTargets(side);
    const unitTargets = targets
      .filter((target): target is Extract<AttackTarget, { type: 'unit' }> => target.type === 'unit')
      .map((target) => foeBoard.find((unit) => unit.uid === target.uid))
      .filter((unit): unit is UnitState => unit !== undefined);
    const canHitHero = targets.some((target) => target.type === 'hero');
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
  if (action.type === 'play') battle.playCard(side, action.handIndex);
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
