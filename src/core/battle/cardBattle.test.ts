import { describe, expect, it } from 'vitest';
import type { CardDef, CardEffect, CardKeyword } from '../content/types';
import { createRng } from '../util/rng';
import { chooseAiAction, performAiStep, playAiTurn } from './ai';
import type { BattleRules } from './cardBattle';
import { CardBattle } from './cardBattle';

const unit = (
  id: string,
  cost: number,
  attack: number,
  health: number,
  keywords: CardKeyword[] = [],
  onPlay?: CardEffect,
): CardDef => ({
  id, type: 'unit', name: id, cost, attack, health, keywords, rarity: 'common', setting: 'test', text: '',
  ...(onPlay ? { onPlay } : {}),
});

const spell = (id: string, cost: number, effect: CardEffect): CardDef => ({
  id, type: 'spell', name: id, cost, effect, rarity: 'common', setting: 'test', text: '',
});

const defs: Record<string, CardDef> = {
  bolt: spell('bolt', 1, { type: 'damageEnemyHero', amount: 3 }),
  potion: spell('potion', 1, { type: 'healHero', amount: 5 }),
  insight: spell('insight', 1, { type: 'draw', count: 2 }),
  quake: spell('quake', 1, { type: 'damageAllEnemies', amount: 2 }),
  banner: spell('banner', 1, { type: 'buffAllies', attack: 1, health: 2 }),
  sniper: unit('sniper', 1, 1, 1, [], { type: 'damageEnemyHero', amount: 2 }),
  grunt: unit('grunt', 1, 2, 2),
  wall: unit('wall', 1, 0, 5, ['guard']),
  rusher: unit('rusher', 1, 3, 1, ['charge']),
  giant: unit('giant', 5, 6, 6),
};

const resolveCard = (id: string): CardDef => {
  const card = defs[id];
  if (!card) throw new Error(`нет карты ${id}`);
  return card;
};

const createBattle = (playerDeck: string[], enemyDeck: string[], rules: Partial<BattleRules> = {}, health = 10): CardBattle =>
  new CardBattle({
    resolveCard,
    player: { name: 'Игрок', health, deck: playerDeck },
    enemy: { name: 'Враг', health, deck: enemyDeck },
    rng: createRng(42),
    rules,
  });

const many = (id: string, count: number): string[] => Array.from({ length: count }, () => id);

describe('CardBattle', () => {
  it('раздаёт стартовые руки, игрок ходит первым с 1 маной', () => {
    const state = createBattle(many('grunt', 10), many('grunt', 10)).snapshot();
    expect(state.active).toBe('player');
    expect(state.sides.player.hand).toHaveLength(4);
    expect(state.sides.enemy.hand).toHaveLength(3);
    expect(state.sides.player.mana).toBe(1);
    expect(state.sides.player.deck).toHaveLength(6);
  });

  it('одинаковый seed даёт одинаковую раздачу', () => {
    const deck = ['grunt', 'wall', 'rusher', 'giant', 'grunt', 'wall', 'rusher', 'giant'];
    expect(createBattle(deck, deck).snapshot()).toEqual(createBattle(deck, deck).snapshot());
  });

  it('розыгрыш карты тратит ману и требует её наличия', () => {
    const battle = createBattle(many('grunt', 10), many('grunt', 10));
    expect(battle.playCard('player', 0)).toEqual({ ok: true });
    expect(battle.snapshot().sides.player.mana).toBe(0);
    expect(battle.snapshot().sides.player.board).toHaveLength(1);
    expect(battle.playCard('player', 0).ok).toBe(false);
    expect(battle.playCard('player', 99).ok).toBe(false);
    expect(battle.playCard('enemy', 0).ok).toBe(false);
  });

  it('существо не атакует в ход розыгрыша, если у него нет рывка', () => {
    const battle = createBattle(many('grunt', 10), many('grunt', 10));
    battle.playCard('player', 0);
    const uid = battle.snapshot().sides.player.board[0]?.uid ?? -1;
    expect(battle.attack('player', uid, { type: 'hero' }).ok).toBe(false);

    const rush = createBattle(many('rusher', 10), many('grunt', 10));
    rush.playCard('player', 0);
    const rusher = rush.snapshot().sides.player.board[0]?.uid ?? -1;
    expect(rush.attack('player', rusher, { type: 'hero' })).toEqual({ ok: true });
    expect(rush.snapshot().sides.enemy.hero.health).toBe(7);
    expect(rush.attack('player', rusher, { type: 'hero' }).ok).toBe(false);
  });

  it('существа обмениваются уроном, погибшие покидают стол', () => {
    const battle = createBattle(many('rusher', 10), many('grunt', 10));
    battle.endTurn('player');
    battle.playCard('enemy', 0);
    battle.endTurn('enemy');
    battle.playCard('player', 0);
    const state = battle.snapshot();
    const attacker = state.sides.player.board[0]?.uid ?? -1;
    const defender = state.sides.enemy.board[0]?.uid ?? -1;
    expect(battle.attack('player', attacker, { type: 'unit', uid: defender })).toEqual({ ok: true });
    const after = battle.snapshot();
    expect(after.sides.player.board).toHaveLength(0);
    expect(after.sides.enemy.board).toHaveLength(0);
  });

  it('защитника нужно атаковать первым', () => {
    const battle = createBattle(many('rusher', 10), many('wall', 10));
    battle.endTurn('player');
    battle.playCard('enemy', 0);
    battle.endTurn('enemy');
    battle.playCard('player', 0);
    const state = battle.snapshot();
    const attacker = state.sides.player.board[0]?.uid ?? -1;
    const wall = state.sides.enemy.board[0]?.uid ?? -1;
    expect(battle.attack('player', attacker, { type: 'hero' }).ok).toBe(false);
    expect(battle.validTargets('player')).toEqual([{ type: 'unit', uid: wall }]);
    expect(battle.attack('player', attacker, { type: 'unit', uid: wall })).toEqual({ ok: true });
    expect(battle.snapshot().sides.enemy.board[0]?.health).toBe(2);
  });

  it('мана растёт каждый ход до предела', () => {
    const battle = createBattle(many('grunt', 30), many('grunt', 30), { manaCap: 3 });
    for (let i = 0; i < 4; i++) {
      battle.endTurn('player');
      battle.endTurn('enemy');
    }
    expect(battle.snapshot().sides.player.maxMana).toBe(3);
    expect(battle.snapshot().sides.player.mana).toBe(3);
  });

  it('стол и рука ограничены по размеру', () => {
    const battle = createBattle(many('grunt', 30), many('grunt', 30), { maxBoard: 1, maxHand: 4 });
    battle.playCard('player', 0);
    battle.endTurn('player');
    battle.endTurn('enemy');
    expect(battle.playCard('player', 0)).toEqual({ ok: false, reason: 'На столе нет места' });
    for (let i = 0; i < 4; i++) {
      battle.endTurn('player');
      battle.endTurn('enemy');
    }
    expect(battle.snapshot().sides.player.hand).toHaveLength(4);
  });

  it('победа наступает, когда здоровье героя падает до нуля, и дальше ходить нельзя', () => {
    const battle = createBattle(many('rusher', 10), many('giant', 10), {}, 3);
    battle.playCard('player', 0);
    const uid = battle.snapshot().sides.player.board[0]?.uid ?? -1;
    battle.attack('player', uid, { type: 'hero' });
    expect(battle.winner).toBe('player');
    expect(battle.endTurn('player').ok).toBe(false);
    expect(battle.playCard('player', 0).ok).toBe(false);
  });

  it('пустая колода наносит нарастающий урон усталости', () => {
    const battle = createBattle(many('grunt', 4), many('grunt', 30), {}, 3);
    battle.endTurn('player');
    battle.endTurn('enemy');
    expect(battle.snapshot().sides.player.hero.health).toBe(2);
    battle.endTurn('player');
    battle.endTurn('enemy');
    expect(battle.snapshot().sides.player.hero.health).toBe(0);
    expect(battle.winner).toBe('enemy');
  });

  it('snapshot — копия: её изменение не влияет на бой', () => {
    const battle = createBattle(many('grunt', 10), many('grunt', 10));
    const copy = battle.snapshot();
    copy.sides.player.hero.health = 0;
    copy.sides.player.hand.length = 0;
    expect(battle.snapshot().sides.player.hero.health).toBe(10);
    expect(battle.snapshot().sides.player.hand).toHaveLength(4);
  });
});

describe('эффекты карт', () => {
  it('заклинание не занимает стол, тратит ману и может закончить бой', () => {
    const battle = createBattle(many('bolt', 10), many('grunt', 10), { maxBoard: 0 }, 3);
    expect(battle.playCard('player', 0)).toEqual({ ok: true });
    const state = battle.snapshot();
    expect(state.sides.player.board).toHaveLength(0);
    expect(state.sides.player.mana).toBe(0);
    expect(state.sides.player.hand).toHaveLength(3);
    expect(battle.winner).toBe('player');
  });

  it('лечение не поднимает здоровье выше максимума', () => {
    const battle = createBattle(many('potion', 10), many('bolt', 10));
    battle.endTurn('player');
    battle.playCard('enemy', 0);
    battle.endTurn('enemy');
    expect(battle.snapshot().sides.player.hero.health).toBe(7);
    battle.playCard('player', 0);
    expect(battle.snapshot().sides.player.hero.health).toBe(10);
  });

  it('добор карт', () => {
    const battle = createBattle(many('insight', 10), many('grunt', 10));
    battle.playCard('player', 0);
    expect(battle.snapshot().sides.player.hand).toHaveLength(5);
    expect(battle.snapshot().sides.player.deck).toHaveLength(4);
  });

  it('урон по всем существам врага убирает погибших', () => {
    const boardAfterQuake = (enemyCard: string): number[] => {
      const battle = createBattle(many('quake', 10), many(enemyCard, 10));
      for (let i = 0; i < 2; i++) {
        battle.endTurn('player');
        battle.playCard('enemy', 0);
        battle.endTurn('enemy');
      }
      expect(battle.snapshot().sides.enemy.board).toHaveLength(2);
      battle.playCard('player', 0);
      return battle.snapshot().sides.enemy.board.map((item) => item.health);
    };
    expect(boardAfterQuake('wall')).toEqual([3, 3]);
    expect(boardAfterQuake('grunt')).toEqual([]);
  });

  it('усиление действует на существ, уже стоящих на столе', () => {
    const battle = createBattle(['grunt', 'banner', 'grunt', 'banner', 'grunt', 'banner', 'grunt', 'banner'], many('wall', 10), {
      startingHand: 0,
    });
    for (let i = 0; i < 3 && battle.snapshot().sides.player.board.length === 0; i++) {
      const hand = battle.snapshot().sides.player.hand;
      const index = hand.indexOf('grunt');
      if (index >= 0) battle.playCard('player', index);
      battle.endTurn('player');
      battle.endTurn('enemy');
    }
    const hand = battle.snapshot().sides.player.hand;
    expect(battle.playCard('player', hand.indexOf('banner'))).toEqual({ ok: true });
    expect(battle.snapshot().sides.player.board[0]).toMatchObject({ attack: 3, health: 4, maxHealth: 4 });
  });

  it('эффект выхода существа срабатывает при розыгрыше', () => {
    const battle = createBattle(many('sniper', 10), many('grunt', 10));
    battle.playCard('player', 0);
    const state = battle.snapshot();
    expect(state.sides.enemy.hero.health).toBe(8);
    expect(state.sides.player.board).toHaveLength(1);
  });
});

describe('playAiTurn', () => {
  it('по шагам: карта, атака, конец хода; вне своего хода ИИ не действует', () => {
    const battle = createBattle(many('grunt', 10), many('rusher', 10));
    expect(chooseAiAction(battle, 'enemy')).toBeNull();
    battle.endTurn('player');
    expect(performAiStep(battle, 'enemy')).toEqual({ type: 'play', handIndex: 0 });
    expect(performAiStep(battle, 'enemy')).toMatchObject({ type: 'attack', target: { type: 'hero' } });
    expect(performAiStep(battle, 'enemy')).toEqual({ type: 'endTurn' });
    expect(battle.active).toBe('player');
  });

  it('разыгрывает карты, атакует и передаёт ход', () => {
    const battle = createBattle(many('grunt', 10), many('rusher', 10));
    battle.endTurn('player');
    playAiTurn(battle, 'enemy');
    const state = battle.snapshot();
    expect(state.active).toBe('player');
    expect(state.sides.enemy.board).toHaveLength(1);
    expect(state.sides.player.hero.health).toBe(7);
  });

  it('бой ИИ против ИИ всегда заканчивается', () => {
    const deck = ['grunt', 'wall', 'rusher', 'giant', 'grunt', 'wall', 'rusher', 'giant'];
    const battle = createBattle(deck, deck, {}, 20);
    for (let turn = 0; turn < 200 && !battle.winner; turn++) playAiTurn(battle, battle.active);
    expect(battle.winner).not.toBeNull();
  });
});
