import type { CardDef, CardId } from '../content/types';
import { createRng } from '../util/rng';
import { playAiTurn } from './ai';
import type { BattleParticipant, Side } from './cardBattle';
import { CardBattle } from './cardBattle';

export interface SimulationResult {
  games: number;
  playerWins: number;
  /** Доля побед стороны игрока, 0..1. */
  winRate: number;
  averageTurns: number;
}

const MAX_TURNS = 200;

/**
 * Прогоняет серию боёв «ИИ против ИИ» и считает долю побед стороны игрока.
 * Инструмент баланса: живой игрок сильнее жадного ИИ, поэтому цифра — нижняя оценка
 * его шансов, зато она воспроизводима и сравнима между правками колод.
 */
export const simulateBattles = (
  resolveCard: (cardId: CardId) => CardDef,
  player: BattleParticipant,
  enemy: BattleParticipant,
  games: number,
  seed = 1,
): SimulationResult => {
  const rng = createRng(seed);
  let playerWins = 0;
  let turns = 0;
  for (let game = 0; game < games; game++) {
    const battle = new CardBattle({ resolveCard, player, enemy, rng });
    for (let turn = 0; turn < MAX_TURNS && !battle.winner; turn++) {
      const side: Side = battle.active;
      playAiTurn(battle, side);
    }
    if (battle.winner === 'player') playerWins += 1;
    turns += battle.snapshot().turn;
  }
  return { games, playerWins, winRate: playerWins / games, averageTurns: turns / games };
};
