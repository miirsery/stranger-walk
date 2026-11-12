import { describe, expect, it } from 'vitest';
import { gameContent } from '@content/index';
import { ContentRegistry } from '../content/registry';
import type { Point } from '../content/types';
import { tileCenter } from '../world/tileMap';
import type { SessionEvent } from './gameSession';
import { GameSession } from './gameSession';

const idle = { x: 0, y: 0 };

const place = (session: GameSession, tile: Point): void => {
  const center = tileCenter(tile);
  session.world.player.x = center.x;
  session.world.player.y = center.y;
  session.update(16, idle);
};

/** Пролистывает открытый диалог до конца. */
const skipDialog = (session: GameSession): void => {
  for (let i = 0; i < 20 && session.mode.kind === 'dialog'; i++) session.interact();
};

const talk = (session: GameSession, standAt: Point): void => {
  place(session, standAt);
  session.interact();
  skipDialog(session);
};

/** Доигрывает ход противника по шагам, как это делает UI. */
const finishEnemyTurn = (session: GameSession): void => {
  for (let i = 0; i < 100 && session.battleEnemyStep(); i++);
};

const record = (session: GameSession): SessionEvent[] => {
  const events: SessionEvent[] = [];
  session.events.on((event) => events.push(event));
  return events;
};

/** Доводит мини-игру до победы, подставляя корзину под хорошие предметы. */
const winMinigame = (session: GameSession): void => {
  for (let i = 0; i < 5000; i++) {
    const mode = session.mode;
    if (mode.kind !== 'minigame') return;
    const game = mode.game;
    const hazardNear = game.items.some((item) => item.kind === 'hazard' && item.y > 80 && Math.abs(item.x - game.basketX) < 22);
    const target = game.items.filter((item) => item.kind === 'good').sort((a, b) => b.y - a.y)[0];
    let axis = 0;
    if (target && !hazardNear) {
      const delta = target.x - game.basketX;
      axis = Math.abs(delta) < 2 ? 0 : Math.sign(delta);
    }
    session.update(16, { x: axis, y: 0 });
  }
};

describe('GameSession', () => {
  it('стартует в мире со стартовой колодой и без квестов', () => {
    const session = new GameSession(gameContent);
    expect(session.mode.kind).toBe('world');
    expect(session.world.level.id).toBe('meadow');
    expect(session.cards.deck).toHaveLength(8);
    expect(session.quests.list()).toEqual([]);
  });

  it('диалог с NPC выдаёт квест после последней реплики', () => {
    const session = new GameSession(gameContent);
    const events = record(session);
    place(session, { x: 5, y: 8 });
    session.interact();
    expect(session.mode.kind).toBe('dialog');
    expect(session.quests.status('first_steps')).toBe('inactive');
    skipDialog(session);
    expect(session.mode.kind).toBe('world');
    expect(session.quests.status('first_steps')).toBe('active');
    expect(events.some((event) => event.type === 'questStarted')).toBe(true);
  });

  it('в диалоге мир стоит на паузе', () => {
    const session = new GameSession(gameContent);
    place(session, { x: 5, y: 8 });
    session.interact();
    const { x } = session.world.player;
    session.update(16, { x: 1, y: 0 });
    expect(session.world.player.x).toBe(x);
  });

  it('звёздные врата закрыты, пока Хранитель не побеждён', () => {
    const session = new GameSession(gameContent);
    session.world.loadLevel('castle');
    place(session, { x: 19, y: 2 });
    expect(session.world.level.id).toBe('castle');
    expect(session.mode.kind).toBe('dialog');
  });

  it('закрытый портал не пропускает и объясняет почему', () => {
    const session = new GameSession(gameContent);
    place(session, { x: 27, y: 8 });
    expect(session.world.level.id).toBe('meadow');
    expect(session.mode.kind).toBe('dialog');
    skipDialog(session);
    session.update(16, idle);
    expect(session.mode.kind).toBe('world');
  });

  it('полное прохождение MVP: квесты → мини-игра → карты → бой с боссом', () => {
    const session = new GameSession(gameContent, { seed: 3 });
    const events = record(session);

    // Луга: квест у старейшины, мини-игра у фермера.
    talk(session, { x: 5, y: 8 });
    place(session, { x: 19, y: 14 });
    session.interact();
    skipDialog(session);
    expect(session.mode.kind).toBe('minigame');
    winMinigame(session);
    expect(events).toContainEqual({ type: 'minigameFinished', minigameId: 'harvest', won: true });
    skipDialog(session);
    expect(session.quests.status('first_steps')).toBe('completed');
    expect(session.cards.count('bull')).toBe(1);
    expect(session.cards.count('archer')).toBe(1);

    // Подлодка: портал открыт, квест капитана, груз у механика.
    place(session, { x: 27, y: 8 });
    expect(session.world.level.id).toBe('submarine');
    talk(session, { x: 3, y: 5 });
    talk(session, { x: 25, y: 3 });
    expect(session.quests.status('deep_cargo')).toBe('completed');
    expect(session.cards.count('kraken')).toBe(1);
    talk(session, { x: 3, y: 5 });
    expect(session.quests.status('final_game')).toBe('active');

    // Замок: бой с Хранителем.
    place(session, { x: 29, y: 4 });
    expect(session.world.level.id).toBe('castle');
    place(session, { x: 10, y: 2 });
    session.interact();
    skipDialog(session);
    const mode = session.mode;
    if (mode.kind !== 'battle') throw new Error(`ожидался бой, а не ${mode.kind}`);
    expect(mode.battle.snapshot().sides.player.deck.length + mode.battle.snapshot().sides.player.hand.length).toBe(
      session.cards.deck.length,
    );

    // Действия вне очереди отклоняются, корректные — проходят.
    expect(session.battleAttack(999, { type: 'hero' }).ok).toBe(false);
    expect(session.battleEndTurn().ok).toBe(true);
    expect(mode.battle.active).toBe('enemy');
    expect(session.battlePlayCard(0).ok).toBe(false);
    finishEnemyTurn(session);
    expect(mode.battle.winner ?? mode.battle.active).toBe(mode.battle.winner ?? 'player');
    expect(session.battleEnemyStep()).toBe(false);

    // Сдаёмся: босс не побеждён, квест не закрыт.
    session.leaveBattle();
    skipDialog(session);
    expect(session.mode.kind).toBe('world');
    expect(session.quests.status('final_game')).toBe('active');
  });

  it('победа над боссом закрывает квест и выдаёт награды', () => {
    const keeper = new ContentRegistry(gameContent).boss('keeper');
    const session = new GameSession({ ...gameContent, bosses: { ...gameContent.bosses, keeper: { ...keeper, health: 1 } } }, { seed: 5 });
    const events = record(session);
    session.world.loadLevel('castle');
    // Квест берём напрямую: путь до него проверен в предыдущем тесте.
    session.quests.start('final_game');
    session.quests.handle({ type: 'levelEntered', levelId: 'castle' });
    place(session, { x: 10, y: 2 });
    session.interact();
    skipDialog(session);

    for (let turn = 0; turn < 50; turn++) {
      const mode = session.mode;
      if (mode.kind !== 'battle' || mode.battle.winner) break;
      const state = mode.battle.snapshot();
      state.sides.player.hand.forEach((_, index) => session.battlePlayCard(state.sides.player.hand.length - 1 - index));
      for (const unit of mode.battle.snapshot().sides.player.board) {
        const target = mode.battle.validTargets('player')[0];
        if (target) session.battleAttack(unit.uid, target);
      }
      session.battleEndTurn();
      finishEnemyTurn(session);
    }

    const mode = session.mode;
    expect(mode.kind === 'battle' && mode.battle.winner).toBe('player');
    expect(events).toContainEqual({ type: 'battleFinished', bossId: 'keeper', won: true });
    session.leaveBattle();
    skipDialog(session);
    expect(session.quests.status('final_game')).toBe('completed');
    expect(session.cards.count('shadow')).toBe(1);
    expect(session.check([{ type: 'bossDefeated', bossId: 'keeper', value: true }])).toBe(true);

    // После победы Хранитель выдаёт следующий квест, а звёздные врата ведут на станцию.
    talk(session, { x: 10, y: 2 });
    expect(session.quests.status('beyond')).toBe('active');
    place(session, { x: 19, y: 2 });
    expect(session.world.level.id).toBe('station');
    expect(session.world.map.setting.id).toBe('space');
  });
});
