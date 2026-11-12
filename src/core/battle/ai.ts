import type { AttackTarget, CardBattle, Side, UnitState } from './cardBattle';
import { opponentOf } from './cardBattle';

/**
 * Простой жадный ИИ: разыгрывает самые дорогие доступные карты, затем атакует —
 * выгодные размены по существам, иначе в героя. В конце передаёт ход.
 */
export const playAiTurn = (battle: CardBattle, side: Side = 'enemy'): void => {
  if (battle.winner || battle.active !== side) return;

  for (;;) {
    const hand = battle.snapshot().sides[side].hand;
    let bestIndex = -1;
    let bestCost = -1;
    hand.forEach((cardId, index) => {
      const cost = battle.card(cardId).cost;
      if (cost > bestCost && battle.canPlay(side, index).ok) {
        bestIndex = index;
        bestCost = cost;
      }
    });
    if (bestIndex < 0) break;
    battle.playCard(side, bestIndex);
  }

  const attackers = battle.snapshot().sides[side].board.filter((unit) => unit.canAttack && unit.attack > 0);
  for (const attacker of attackers) {
    if (battle.winner) return;
    const state = battle.snapshot();
    const foeBoard = state.sides[opponentOf(side)].board;
    const targets = battle.validTargets(side);
    const unitTargets = targets
      .filter((target): target is Extract<AttackTarget, { type: 'unit' }> => target.type === 'unit')
      .map((target) => foeBoard.find((unit) => unit.uid === target.uid))
      .filter((unit): unit is UnitState => unit !== undefined);
    const canHitHero = targets.some((target) => target.type === 'hero');

    const goodTrade = unitTargets.find((unit) => unit.health <= attacker.attack && unit.attack < attacker.health);
    const fallback = unitTargets[0];
    let target: AttackTarget | undefined;
    if (goodTrade) target = { type: 'unit', uid: goodTrade.uid };
    else if (canHitHero) target = { type: 'hero' };
    else if (fallback) target = { type: 'unit', uid: fallback.uid };
    if (target) battle.attack(side, attacker.uid, target);
  }

  if (!battle.winner) battle.endTurn(side);
};
