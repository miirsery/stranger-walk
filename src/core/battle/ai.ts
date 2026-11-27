import type { AiLevel, CardEffect } from '../content/types';
import type { AttackTarget, BattleState, CardBattle, Side, UnitState } from './cardBattle';
import { opponentOf, RAGE_BURST_DAMAGE } from './cardBattle';

export type AiAction =
  | { type: 'play'; handIndex: number; target?: AttackTarget }
  | { type: 'power'; target?: AttackTarget }
  | { type: 'rage' }
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
  return card.type === 'spell' ? chooseEffectTarget(card.effect, state, side) : undefined;
};

const chooseEffectTarget = (effect: CardEffect, state: BattleState, side: Side): AttackTarget | undefined => {
  const byAttack = (units: UnitState[]): UnitState[] => [...units].sort((a, b) => b.attack - a.attack);

  if (effect.type === 'buffTarget') {
    const best = byAttack(state.sides[side].board)[0];
    return best ? { type: 'unit', uid: best.uid } : undefined;
  }
  if (effect.type === 'damageTarget') {
    const { amount } = effect;
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
const chooseGreedyAction = (battle: CardBattle, side: Side): AiAction | null => {
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

  // Осталась мана — в дело идёт сила героя, если от неё будет толк.
  if (own.power && battle.canUsePower(side).ok && !isWasted(own.power.effect, state, side)) {
    const target = chooseEffectTarget(own.power.effect, state, side);
    return target ? { type: 'power', target } : { type: 'power' };
  }

  // Ярость не тратит ману — используем сразу, как только накопилась.
  if (battle.canUseRage(side).ok && !isWasted({ type: 'damageEnemyHero', amount: RAGE_BURST_DAMAGE }, state, side)) {
    return { type: 'rage' };
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

const applyAction = (battle: CardBattle, side: Side, action: AiAction): void => {
  if (action.type === 'play') battle.playCard(side, action.handIndex, action.target);
  else if (action.type === 'power') battle.usePower(side, action.target);
  else if (action.type === 'rage') battle.useRage(side);
  else if (action.type === 'attack') battle.attack(side, action.attackerUid, action.target);
  else battle.endTurn(side);
};

const MAX_STEPS = 100;

/** Оценка положения стороны: разница здоровья героев и силы столов; победа и поражение перевешивают всё. */
const evaluate = (battle: CardBattle, side: Side): number => {
  if (battle.winner) return battle.winner === side ? 10_000 : -10_000;
  const state = battle.snapshot();
  const own = state.sides[side];
  const foe = state.sides[opponentOf(side)];
  const boardPower = (units: UnitState[]): number =>
    units.reduce((sum, unit) => sum + unit.attack * 1.5 + unit.health + (unit.keywords.includes('guard') ? 1 : 0), 0);
  return (
    (own.hero.health - foe.hero.health) * 1.2 +
    boardPower(own.board) -
    boardPower(foe.board) +
    (own.hand.length - foe.hand.length) * 0.5
  );
};

/** Все осмысленные следующие действия: карты (с каждой целью), сила героя и каждая атака. */
const candidateActions = (battle: CardBattle, side: Side): AiAction[] => {
  const own = battle.snapshot().sides[side];
  const actions: AiAction[] = [];
  own.hand.forEach((_, handIndex) => {
    if (!battle.canPlay(side, handIndex).ok) return;
    const targets = battle.validPlayTargets(side, handIndex);
    if (targets.length === 0) actions.push({ type: 'play', handIndex });
    else for (const target of targets) actions.push({ type: 'play', handIndex, target });
  });
  if (own.power && battle.canUsePower(side).ok) {
    const targets = battle.validPowerTargets(side);
    if (targets.length === 0) actions.push({ type: 'power' });
    else for (const target of targets) actions.push({ type: 'power', target });
  }
  if (battle.canUseRage(side).ok) actions.push({ type: 'rage' });
  const targets = battle.validTargets(side);
  for (const unit of own.board) {
    if (!unit.canAttack || unit.attack <= 0) continue;
    for (const target of targets) actions.push({ type: 'attack', attackerUid: unit.uid, target });
  }
  return actions;
};

/** Доигрывает остаток хода жадным ИИ — так оценивается, куда приведёт пробное действие. */
const finishTurnGreedily = (battle: CardBattle, side: Side): void => {
  for (let step = 0; step < MAX_STEPS; step++) {
    const action = chooseGreedyAction(battle, side);
    if (!action || action.type === 'endTurn') return;
    applyAction(battle, side, action);
  }
};

/**
 * Умный ИИ: для каждого возможного действия проигрывает на копии боя остаток хода жадным ИИ
 * и выбирает действие, после которого положение лучше. Конец хода тоже вариант — со своей оценкой.
 */
const chooseSmartAction = (battle: CardBattle, side: Side): AiAction | null => {
  if (battle.winner || battle.active !== side) return null;
  const options: AiAction[] = [...candidateActions(battle, side), { type: 'endTurn' }];
  let best: AiAction = { type: 'endTurn' };
  let bestScore = -Infinity;
  for (const action of options) {
    const trial = battle.clone();
    if (action.type !== 'endTurn') {
      applyAction(trial, side, action);
      finishTurnGreedily(trial, side);
    }
    const score = evaluate(trial, side);
    // Небольшая прибавка «выжать максимум» — при равной оценке предпочитаем действие, а не конец хода.
    const adjusted = action.type === 'endTurn' ? score : score + 0.01;
    if (adjusted > bestScore) {
      bestScore = adjusted;
      best = action;
    }
  }
  return best;
};

export const chooseAiAction = (battle: CardBattle, side: Side = 'enemy', level: AiLevel = 'basic'): AiAction | null =>
  level === 'smart' ? chooseSmartAction(battle, side) : chooseGreedyAction(battle, side);

/** Выполняет одно действие ИИ. Возвращает его (или null, если действовать нельзя). */
export const performAiStep = (battle: CardBattle, side: Side = 'enemy', level: AiLevel = 'basic'): AiAction | null => {
  const action = chooseAiAction(battle, side, level);
  if (!action) return null;
  applyAction(battle, side, action);
  return action;
};

/** Весь ход ИИ целиком — для тестов и симуляций. */
export const playAiTurn = (battle: CardBattle, side: Side = 'enemy', level: AiLevel = 'basic'): void => {
  // Ограничение на случай ошибки в правилах: ход не может длиться бесконечно.
  for (let step = 0; step < MAX_STEPS; step++) {
    const action = performAiStep(battle, side, level);
    if (!action || action.type === 'endTurn') return;
  }
};
