import { describe, expect, it } from 'vitest';
import { gameContent } from '@content/index';
import { ContentRegistry } from '../content/registry';
import type { Point } from '../content/types';
import { tileCenter } from '../world/tileMap';
import type { SessionEvent } from './gameSession';
import { GameSession } from './gameSession';

const idle = { x: 0, y: 0 };

/** Создаёт сессию и сразу закрывает вступительную сцену стартового уровня — тесты её не проверяют. */
const createSession = (...args: ConstructorParameters<typeof GameSession>): GameSession => {
  const instance = new GameSession(...args);
  instance.leaveScene();
  return instance;
};

const place = (session: GameSession, tile: Point): void => {
  // Вступительная сцена уровня (если есть) не мешает тестам передвижения — закрываем её.
  session.leaveScene();
  const center = tileCenter(tile);
  session.world.player.x = center.x;
  session.world.player.y = center.y;
  session.update(16, idle);
};

/** Пролистывает открытый диалог до конца. */
const skipDialog = (session: GameSession): void => {
  for (let i = 0; i < 20 && session.mode.kind === 'dialog'; i++) session.interact();
};

/** Если после победы предложена карта на выбор — берёт первую. */
const takeChoice = (session: GameSession): void => {
  if (session.mode.kind === 'reward') session.chooseReward(0);
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
  session.interact();
  for (let i = 0; i < 5000; i++) {
    const mode = session.mode;
    if (mode.kind !== 'minigame' || mode.game.type !== 'catch' || mode.phase !== 'playing') return;
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

/** Собирает все пары в мини-игре на память (тест видит карты «насквозь»). */
const solveMemory = (session: GameSession): void => {
  const mode = session.mode;
  if (mode.kind !== 'minigame' || mode.game.type !== 'memory') throw new Error('ожидалась мини-игра на память');
  session.startMinigame();
  const game = mode.game;
  for (const cardId of game.def.cards) {
    game.tiles.forEach((tile, index) => {
      if (tile.cardId === cardId) game.flip(index);
    });
  }
  session.update(16, idle);
};

/** Доводит «пятнашки» до победы: подменяет расклад на один ход от решения. */
const solveSlide = (session: GameSession): void => {
  const mode = session.mode;
  if (mode.kind !== 'minigame' || mode.game.type !== 'slide') throw new Error('ожидалась мини-игра «пятнашки»');
  session.startMinigame();
  const game = mode.game;
  const total = game.size * game.size;
  const last = total - 1;
  game.tiles = Array.from({ length: total }, (_, index) => (index + 1) % total);
  const beforeLast = game.tiles[last - 1];
  const blank = game.tiles[last];
  if (beforeLast === undefined || blank === undefined) throw new Error('некорректный размер поля');
  game.tiles[last - 1] = blank;
  game.tiles[last] = beforeLast;
  game.move(last);
  session.update(16, idle);
};

describe('GameSession', () => {
  it('стартует в мире со стартовой колодой и без квестов', () => {
    const session = createSession(gameContent);
    expect(session.mode.kind).toBe('world');
    expect(session.world.level.id).toBe('meadow');
    expect(session.cards.deck).toHaveLength(8);
    expect(session.quests.list()).toEqual([]);
  });

  it('диалог с NPC выдаёт квест после последней реплики', () => {
    const session = createSession(gameContent);
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
    const session = createSession(gameContent);
    place(session, { x: 5, y: 8 });
    session.interact();
    const { x } = session.world.player;
    session.update(16, { x: 1, y: 0 });
    expect(session.world.player.x).toBe(x);
  });

  it('звёздные врата закрыты, пока Хранитель не побеждён', () => {
    const session = createSession(gameContent);
    session.world.loadLevel('castle');
    place(session, { x: 19, y: 2 });
    expect(session.world.level.id).toBe('castle');
    expect(session.mode.kind).toBe('dialog');
  });

  it('закрытый портал не пропускает и объясняет почему', () => {
    const session = createSession(gameContent);
    place(session, { x: 27, y: 8 });
    expect(session.world.level.id).toBe('meadow');
    expect(session.mode.kind).toBe('dialog');
    skipDialog(session);
    session.update(16, idle);
    expect(session.mode.kind).toBe('world');
  });

  it('полное прохождение MVP: квесты → мини-игра → карты → бой с боссом', () => {
    const session = createSession(gameContent, { seed: 3 });
    const events = record(session);

    // Луга: квест у старейшины, мини-игра у фермера.
    talk(session, { x: 5, y: 8 });
    place(session, { x: 19, y: 14 });
    session.interact();
    skipDialog(session);
    expect(session.mode.kind).toBe('minigame');
    winMinigame(session);
    expect(events).toContainEqual({ type: 'minigameFinished', minigameId: 'harvest', won: true });
    // Итог остаётся на экране, пока игрок не выйдет кнопкой действия.
    expect(session.mode.kind).toBe('minigame');
    session.interact();
    // За победу предлагается ещё одна карта на выбор; отказаться от неё нельзя.
    expect(session.mode.kind).toBe('reward');
    session.declineReward();
    expect(session.mode.kind).toBe('reward');
    session.chooseReward(0);
    expect(session.mode.kind).toBe('world');
    expect(session.cards.count('viper')).toBe(1);
    expect(session.quests.status('first_steps')).toBe('completed');
    expect(session.cards.count('bull')).toBe(1);
    expect(session.cards.count('archer')).toBe(1);

    // Подлодка: портал открыт, квест капитана, груз у механика.
    place(session, { x: 27, y: 8 });
    expect(session.world.level.id).toBe('submarine');
    talk(session, { x: 3, y: 5 });
    talk(session, { x: 25, y: 3 });
    solveMemory(session);
    session.quitMinigame();
    takeChoice(session);
    expect(session.quests.status('deep_cargo')).toBe('completed');
    expect(session.cards.count('depth_charge')).toBe(1);
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

    // Бой начинается с замены стартовой руки.
    expect(mode.battle.phase).toBe('mulligan');
    expect(session.battleEndTurn().ok).toBe(false);
    expect(session.battleMulligan([0]).ok).toBe(true);

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
    // Сдача засчитывается как поражение — достижение «без поражений» больше недостижимо.
    expect(session.achievements().find((entry) => entry.id === 'no_defeats')?.done).toBe(false);
  });

  it('победа над боссом закрывает квест и выдаёт награды', () => {
    const keeper = new ContentRegistry(gameContent).boss('keeper');
    const session = createSession({ ...gameContent, bosses: { ...gameContent.bosses, keeper: { ...keeper, health: 1 } } }, { seed: 5 });
    const events = record(session);
    session.world.loadLevel('castle');
    // Квест берём напрямую: путь до него проверен в предыдущем тесте.
    session.quests.start('final_game');
    session.quests.handle({ type: 'levelEntered', levelId: 'castle' });
    expect(session.bestiary().find((entry) => entry.boss.id === 'keeper')?.met).toBe(false);
    place(session, { x: 10, y: 2 });
    session.interact();
    skipDialog(session);
    // Бой начался — бестиарий открывается сразу, не только после победы.
    expect(session.bestiary().find((entry) => entry.boss.id === 'keeper')?.met).toBe(true);

    session.battleMulligan([]);
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
    takeChoice(session);
    skipDialog(session);
    expect(session.quests.status('final_game')).toBe('completed');
    expect(session.cards.count('shadow')).toBe(1);
    expect(session.check([{ type: 'bossDefeated', bossId: 'keeper', value: true }])).toBe(true);
    expect(session.bestiary().find((entry) => entry.boss.id === 'keeper')?.defeated).toBe(true);

    // После победы Хранитель выдаёт следующий квест, а звёздные врата ведут на станцию.
    talk(session, { x: 10, y: 2 });
    expect(session.quests.status('beyond')).toBe('active');
    place(session, { x: 19, y: 2 });
    expect(session.world.level.id).toBe('station');
    expect(session.world.map.setting.id).toBe('space');
  });

  it('победа над последним боссом показывает финальную сцену, а не возврат в мир', () => {
    const captain = new ContentRegistry(gameContent).boss('void_captain');
    const session = createSession(
      { ...gameContent, bosses: { ...gameContent.bosses, void_captain: { ...captain, health: 1 } } },
      { seed: 7 },
    );
    session.world.loadLevel('station');
    session.quests.start('beyond');
    session.quests.handle({ type: 'levelEntered', levelId: 'station' });
    place(session, { x: 18, y: 5 });
    session.interact();
    skipDialog(session);

    session.battleMulligan([]);
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
    expect(session.mode.kind === 'battle' && session.mode.battle.winner).toBe('player');

    session.leaveBattle();
    takeChoice(session);
    skipDialog(session);
    expect(session.quests.status('beyond')).toBe('completed');

    const mode = session.mode;
    if (mode.kind !== 'finale') throw new Error(`ожидалась финальная сцена, а не ${mode.kind}`);
    expect(mode.title).toBe('Эпилог. Возвращённая колода');
    expect(mode.lines.length).toBeGreaterThan(0);

    // Финал можно закрыть и продолжить игру — мир не блокируется.
    session.leaveFinale();
    expect(session.mode.kind).toBe('world');
  });

  it('выбранная стартовая колода заменяет колоду по умолчанию', () => {
    const bastion = gameContent.starterDecks.find((deck) => deck.id === 'bastion');
    if (!bastion) throw new Error('в контенте нет колоды «bastion»');
    const session = createSession(gameContent, { starterDeck: bastion.cards });

    expect(session.cards.deck).toEqual(bastion.cards);
    expect(session.cards.deck).not.toEqual(gameContent.player.starterDeck);
    for (const cardId of new Set(bastion.cards)) {
      const copies = bastion.cards.filter((id) => id === cardId).length;
      expect(session.cards.count(cardId)).toBe(copies);
    }
  });

  it('элитный враг не привязан к квестам: побеждается и выдаёт свою награду в любой момент', () => {
    const warden = new ContentRegistry(gameContent).boss('casemate_warden');
    const session = createSession(
      { ...gameContent, bosses: { ...gameContent.bosses, casemate_warden: { ...warden, health: 1 } } },
      { seed: 11 },
    );
    session.world.loadLevel('casemate');
    place(session, { x: 11, y: 5 });
    expect(session.bestiary().find((entry) => entry.boss.id === 'casemate_warden')?.met).toBe(false);
    session.interact();
    skipDialog(session);
    expect(session.bestiary().find((entry) => entry.boss.id === 'casemate_warden')?.met).toBe(true);

    session.battleMulligan([]);
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
    expect(session.mode.kind === 'battle' && session.mode.battle.winner).toBe('player');
    session.leaveBattle();
    skipDialog(session);

    expect(session.cards.count('warden')).toBe(1);
    expect(session.check([{ type: 'bossDefeated', bossId: 'casemate_warden', value: true }])).toBe(true);
    expect(session.bestiary().find((entry) => entry.boss.id === 'casemate_warden')?.defeated).toBe(true);
    // Квесты элитный враг не трогает — это необязательный бой вне сюжета.
    expect(session.quests.list()).toEqual([]);
  });

  it('Пещеры: скрытый портал с лугов ведёт к сундуку, мини-игре и боссу — всё вне квестов', () => {
    const golem = new ContentRegistry(gameContent).boss('crystal_golem');
    const session = createSession(
      { ...gameContent, bosses: { ...gameContent.bosses, crystal_golem: { ...golem, health: 1 } } },
      { seed: 13 },
    );
    place(session, { x: 14, y: 17 });
    expect(session.world.level.id).toBe('caves');
    expect(session.world.map.setting.id).toBe('caves');

    // Сундук с выбором карты.
    place(session, { x: 3, y: 3 });
    session.interact();
    expect(session.mode.kind).toBe('reward');
    takeChoice(session);
    const afterChest = session.cards.list().reduce((sum, { count }) => sum + count, 0);
    expect(afterChest).toBe(10); // 8 стартовых + 1 выбранная + 1 гарантированная (осколок) из сундука

    // Мини-игра «Эхо пещер» — своя, эксклюзивная для этого сеттинга.
    talk(session, { x: 4, y: 4 });
    solveMemory(session);
    session.quitMinigame();
    expect(session.hasWonMinigame('cave_memory')).toBe(true);
    takeChoice(session);

    // Босс — необязательный, вне сюжета и квестов.
    expect(session.bestiary().find((entry) => entry.boss.id === 'crystal_golem')?.met).toBe(false);
    place(session, { x: 14, y: 4 });
    session.interact();
    skipDialog(session);
    expect(session.bestiary().find((entry) => entry.boss.id === 'crystal_golem')?.met).toBe(true);

    session.battleMulligan([]);
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
    expect(session.mode.kind === 'battle' && session.mode.battle.winner).toBe('player');
    session.leaveBattle();
    takeChoice(session);
    skipDialog(session);

    expect(session.cards.count('golem_heart')).toBe(1);
    expect(session.check([{ type: 'bossDefeated', bossId: 'crystal_golem', value: true }])).toBe(true);
    expect(session.bestiary().find((entry) => entry.boss.id === 'crystal_golem')?.defeated).toBe(true);
    expect(session.quests.list()).toEqual([]);
  });

  it('Пятый тип мини-игры «пятнашки»: отшельница в лесу, победа и выбор награды', () => {
    const session = createSession(gameContent, { seed: 7 });

    place(session, { x: 0, y: 4 });
    expect(session.world.level.id).toBe('forest');

    talk(session, { x: 2, y: 2 });
    expect(session.mode.kind).toBe('minigame');
    const mode = session.mode;
    if (mode.kind !== 'minigame' || mode.game.type !== 'slide') throw new Error('ожидалась мини-игра «пятнашки»');
    expect(mode.def.id).toBe('forest_puzzle');

    solveSlide(session);
    expect(session.hasWonMinigame('forest_puzzle')).toBe(true);
    session.quitMinigame();
    expect(session.mode.kind).toBe('reward');
    takeChoice(session);
    expect(session.mode.kind).toBe('world');

    expect(session.cards.count('reaper')).toBe(3); // 2 стартовых + 1 из награды
    expect(session.quests.list()).toEqual([]);
  });

  it('Ветвящийся побочный квест: отпустить лисицу — другая награда и реплика при новом визите', () => {
    const session = createSession(gameContent, { seed: 5 });

    place(session, { x: 10, y: 11 });
    session.interact(); // первая реплика
    session.interact(); // последняя реплика — вопрос с выбором
    const mode = session.mode;
    if (mode.kind !== 'dialog') throw new Error('ожидался диалог');
    expect(mode.dialog.choices).toEqual(['Отпустить лисицу', 'Забрать шкуру']);

    session.chooseDialogOption(0);
    skipDialog(session);
    expect(session.mode.kind).toBe('world');
    expect(session.quests.status('trapped_fox')).toBe('completed');
    expect(session.cards.count('fox')).toBe(3); // 2 стартовых + 1 за квест
    expect(session.cards.count('feast')).toBe(1); // награда именно за этот выбор
    expect(session.cards.count('scarecrow')).toBe(2); // не изменилась — это награда другого выбора

    // Повторный визит: лисицы давно нет, реплика другая, выбора больше не предлагают.
    place(session, { x: 10, y: 11 });
    session.interact();
    const again = session.mode;
    if (again.kind !== 'dialog') throw new Error('ожидался диалог');
    expect(again.dialog.choices).toBeNull();
    expect(again.dialog.lines).toEqual(['Капкан давно пуст — лисица убежала в чащу, едва ты щёлкнул защёлкой.']);
    skipDialog(session);
  });

  it('Ветвящийся побочный квест: забрать шкуру — другая награда и реплика при новом визите', () => {
    const session = createSession(gameContent, { seed: 5 });

    place(session, { x: 10, y: 11 });
    session.interact();
    session.interact();
    session.chooseDialogOption(1);
    skipDialog(session);
    expect(session.cards.count('fox')).toBe(3);
    expect(session.cards.count('scarecrow')).toBe(3); // 2 стартовых + 1 за этот выбор
    expect(session.cards.count('feast')).toBe(0);

    place(session, { x: 10, y: 11 });
    session.interact();
    const again = session.mode;
    if (again.kind !== 'dialog') throw new Error('ожидался диалог');
    expect(again.dialog.choices).toBeNull();
    expect(again.dialog.lines).toEqual(['От капкана остались одни щепки — шкуру ты забрал ещё тогда.']);
    skipDialog(session);
  });

  it('Репутация NPC: несколько мелких поступков накопительно меняют, что продаёт торговка', () => {
    const session = createSession(gameContent, { seed: 9 });
    expect(session.reputation).toBe(0);

    // Доброе дело №1: отпустить лисицу (+2).
    place(session, { x: 10, y: 11 });
    session.interact();
    session.interact();
    session.chooseDialogOption(0);
    skipDialog(session);
    expect(session.reputation).toBe(2);

    // Доброе дело №2: поделиться едой с бродягой (+2) — поступки копятся.
    place(session, { x: 6, y: 13 });
    session.interact();
    const dialog = session.mode;
    if (dialog.kind !== 'dialog') throw new Error('ожидался диалог');
    expect(dialog.dialog.choices).toEqual(['Поделиться едой', 'Прогнать']);
    session.chooseDialogOption(0);
    skipDialog(session);
    expect(session.reputation).toBe(4);

    // Торговка при высокой репутации продаёт дешевле обычного.
    talk(session, { x: 23, y: 12 });
    const trade = session.mode;
    if (trade.kind !== 'trade') throw new Error('ожидалась лавка');
    expect(trade.offers).toEqual([
      { cardId: 'bull', price: 16 },
      { cardId: 'ghost', price: 9 },
      { cardId: 'knight', price: 20 },
    ]);
    session.leaveTrade();

    // Повторный визит к бродяге: другая реплика, выбора больше нет.
    place(session, { x: 6, y: 13 });
    session.interact();
    const again = session.mode;
    if (again.kind !== 'dialog') throw new Error('ожидался диалог');
    expect(again.dialog.choices).toBeNull();
    expect(again.dialog.lines).toEqual(['Твоя доброта меня до сих пор греет. Храни тебя луга.']);
    skipDialog(session);
  });

  it('Репутация NPC: несколько плохих поступков накопительно — торговка берёт дороже', () => {
    const session = createSession(gameContent, { seed: 9 });

    place(session, { x: 10, y: 11 });
    session.interact();
    session.interact();
    session.chooseDialogOption(1); // забрать шкуру, -2
    skipDialog(session);

    place(session, { x: 6, y: 13 });
    session.interact();
    session.chooseDialogOption(1); // прогнать бродягу, -2
    skipDialog(session);
    expect(session.reputation).toBe(-4);

    talk(session, { x: 23, y: 12 });
    const trade = session.mode;
    if (trade.kind !== 'trade') throw new Error('ожидалась лавка');
    expect(trade.offers).toEqual([
      { cardId: 'bull', price: 26 },
      { cardId: 'ghost', price: 16 },
      { cardId: 'knight', price: 32 },
    ]);
  });

  it('Репутация сохраняется и восстанавливается, а New Game+ сбрасывает её', () => {
    const session = createSession(gameContent, { seed: 9 });
    place(session, { x: 6, y: 13 });
    session.interact();
    session.chooseDialogOption(0);
    skipDialog(session);
    expect(session.reputation).toBe(2);

    const restored = GameSession.restore(gameContent, session.serialize());
    expect(restored.reputation).toBe(2);
    expect(restored.check([{ type: 'reputation', atLeast: 2 }])).toBe(true);
    expect(restored.check([{ type: 'reputation', atMost: -3 }])).toBe(false);
  });

  /** Доигрывает бой с ослабленным (health:1) Капитаном Пустоты до победы и закрывает диалог победы. */
  const defeatVoidCaptain = (session: GameSession): void => {
    session.world.loadLevel('station');
    session.quests.start('beyond');
    session.quests.handle({ type: 'levelEntered', levelId: 'station' });
    place(session, { x: 18, y: 5 });
    session.interact();
    skipDialog(session);
    session.battleMulligan([]);
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
    session.leaveBattle();
    takeChoice(session);
    skipDialog(session);
  };

  it('Секретная концовка не показывается без полного набора осколков', () => {
    const captain = new ContentRegistry(gameContent).boss('void_captain');
    const session = createSession(
      { ...gameContent, bosses: { ...gameContent.bosses, void_captain: { ...captain, health: 1 } } },
      { seed: 7 },
    );
    defeatVoidCaptain(session);
    const mode = session.mode;
    if (mode.kind !== 'finale') throw new Error(`ожидался эпилог, а не ${mode.kind}`);
    expect(mode.title).toBe(captain.finale?.title);
    expect(mode.lines).toEqual(captain.finale?.lines);
  });

  it('Секретная концовка: собрав все пять осколков, игрок получает сцену сверх обычного эпилога', () => {
    const captain = new ContentRegistry(gameContent).boss('void_captain');
    const session = createSession(
      { ...gameContent, bosses: { ...gameContent.bosses, void_captain: { ...captain, health: 1 } } },
      { seed: 7 },
    );
    for (const cardId of gameContent.secretEnding.requiredCards) session.cards.add(cardId);

    defeatVoidCaptain(session);
    const mode = session.mode;
    if (mode.kind !== 'finale') throw new Error(`ожидался эпилог, а не ${mode.kind}`);
    expect(mode.title).toBe(gameContent.secretEnding.title);
    // Обычный эпилог не заменяется, а дополняется секретными строками.
    expect(mode.lines).toEqual([...(captain.finale?.lines ?? []), ...gameContent.secretEnding.lines]);
  });

  it('New Game+ сбрасывает мир и квесты, но не колоду, и усиливает боссов', () => {
    const captain = new ContentRegistry(gameContent).boss('void_captain');
    const session = createSession(
      { ...gameContent, bosses: { ...gameContent.bosses, void_captain: { ...captain, health: 1 } } },
      { seed: 7 },
    );
    session.world.loadLevel('station');
    session.quests.start('beyond');
    session.quests.handle({ type: 'levelEntered', levelId: 'station' });
    place(session, { x: 18, y: 5 });
    session.interact();
    skipDialog(session);

    session.battleMulligan([]);
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
    session.leaveBattle();
    takeChoice(session);
    skipDialog(session);
    expect(session.quests.status('beyond')).toBe('completed');
    const cardsBefore = session.cards.list().reduce((sum, { count }) => sum + count, 0);

    expect(session.achievements().find((entry) => entry.id === 'no_defeats')?.done).toBe(true);

    expect(session.newGamePlus).toBe(0);
    session.startNewGamePlus();
    expect(session.newGamePlus).toBe(1);
    // Карты остаются — доступ к наградам прежних сундуков не теряется.
    expect(session.cards.list().reduce((sum, { count }) => sum + count, 0)).toBe(cardsBefore);
    // Квесты, боссы и мир сброшены к началу игры.
    expect(session.quests.status('beyond')).toBe('inactive');
    expect(session.check([{ type: 'bossDefeated', bossId: 'void_captain', value: false }])).toBe(true);
    // Достижение остаётся засчитанным даже после сброса побеждённых боссов.
    expect(session.achievements().find((entry) => entry.id === 'no_defeats')?.done).toBe(true);
    // Бестиарий тоже не забывает уже встреченных боссов.
    expect(session.bestiary().find((entry) => entry.boss.id === 'void_captain')?.met).toBe(true);
    expect(session.bestiary().find((entry) => entry.boss.id === 'void_captain')?.defeated).toBe(false);
    expect(session.world.level.id).toBe(gameContent.player.startLevel);
    if (session.mode.kind === 'scene') session.leaveScene();
    expect(session.mode.kind).toBe('world');

    // Боссы в новом цикле крепче.
    const keeperFromContent = new ContentRegistry(gameContent).boss('keeper');
    session.world.loadLevel('castle');
    session.quests.start('final_game');
    session.quests.handle({ type: 'levelEntered', levelId: 'castle' });
    place(session, { x: 10, y: 2 });
    session.interact();
    skipDialog(session);
    const mode = session.mode;
    if (mode.kind !== 'battle') throw new Error(`ожидался бой, а не ${mode.kind}`);
    expect(mode.battle.snapshot().sides.enemy.hero.health).toBe(Math.round(keeperFromContent.health * 1.25));
  });

  it('вступительная сцена уровня показывается один раз при первом входе в мир', () => {
    // Новая игра начинается со сцены стартового уровня — до первого же действия игрока.
    const session = new GameSession(gameContent, { seed: 9 });
    const mode = session.mode;
    if (mode.kind !== 'scene') throw new Error(`ожидалась вступительная сцена, а не ${mode.kind}`);
    expect(mode.title).toBe('Глава 1. Тихие луга');
    session.leaveScene();
    expect(session.mode.kind).toBe('world');

    talk(session, { x: 5, y: 8 });
    place(session, { x: 19, y: 14 });
    session.interact();
    skipDialog(session);
    session.cheatWinMinigame();
    session.interact();
    takeChoice(session);

    // Подлодка — новый уровень: сцена показывается при входе в неё впервые.
    place(session, { x: 27, y: 8 });
    expect(session.world.level.id).toBe('submarine');
    const submarineMode = session.mode;
    if (submarineMode.kind !== 'scene') throw new Error(`ожидалась сцена подлодки, а не ${submarineMode.kind}`);
    expect(submarineMode.title).toBe('Глава 2. «Наутилус-8»');
    session.leaveScene();

    // Повторный вход в уже увиденный мир сцену не повторяет.
    session.cheatTeleport('meadow');
    expect(session.mode.kind).toBe('world');

    const save = session.serialize();
    expect([...save.seenChapters].sort()).toEqual(['meadow', 'submarine']);

    // Сохранение возвращает в мир, не повторяя уже увиденные сцены.
    const restored = GameSession.restore(gameContent, save);
    expect(restored.mode.kind).toBe('world');
  });

  describe('мини-игра: вступление, выход, перезапуск', () => {
    /** Сессия на вступлении мини-игры «Сбор урожая». */
    const atHarvestIntro = (): GameSession => {
      const session = createSession(gameContent, { seed: 3 });
      talk(session, { x: 5, y: 8 });
      talk(session, { x: 19, y: 14 });
      return session;
    };

    it('начинается со вступления: время не идёт, пока игрок не нажал «Начать»', () => {
      const session = atHarvestIntro();
      const mode = session.mode;
      if (mode.kind !== 'minigame' || mode.game.type !== 'catch') throw new Error('ожидалась мини-игра');
      expect(mode.phase).toBe('intro');
      expect(mode.wonBefore).toBe(false);
      session.update(1000, idle);
      expect(mode.game.timeLeftMs).toBe(mode.game.def.durationMs);
      session.startMinigame();
      session.update(16, idle);
      expect(mode.game.timeLeftMs).toBeLessThan(mode.game.def.durationMs);
    });

    it('из мини-игры можно выйти в любой момент без потери прогресса квеста', () => {
      const session = atHarvestIntro();
      session.quitMinigame();
      expect(session.mode.kind).toBe('world');
      expect(session.quests.status('first_steps')).toBe('active');
      expect(session.quests.list()[0]?.objectives[0]?.done).toBe(true);

      talk(session, { x: 19, y: 14 });
      session.startMinigame();
      session.update(16, idle);
      session.quitMinigame();
      expect(session.mode.kind).toBe('world');
    });

    it('перезапуск создаёт новую игру и сразу её начинает', () => {
      const session = atHarvestIntro();
      session.startMinigame();
      for (let i = 0; i < 200; i++) session.update(16, idle);
      const before = session.mode;
      if (before.kind !== 'minigame' || before.game.type !== 'catch') throw new Error('ожидалась мини-игра');
      const oldGame = before.game;
      session.restartMinigame();
      const after = session.mode;
      if (after.kind !== 'minigame' || after.game.type !== 'catch') throw new Error('ожидалась мини-игра');
      expect(after.game).not.toBe(oldGame);
      expect(after.phase).toBe('playing');
      expect(after.game.timeLeftMs).toBe(after.game.def.durationMs);
    });

    it('повторный запуск пройденной мини-игры помечен и не выдаёт награды второй раз', () => {
      const session = atHarvestIntro();
      session.cheatWinMinigame();
      session.quitMinigame();
      takeChoice(session);
      const cards = session.cards.total;
      talk(session, { x: 19, y: 14 });
      const mode = session.mode;
      if (mode.kind !== 'minigame') throw new Error('ожидалась мини-игра');
      expect(mode.wonBefore).toBe(true);
      session.cheatWinMinigame();
      expect(session.cards.total).toBe(cards);
    });
  });

  describe('отладочные команды', () => {
    it('победа в мини-игре засчитывается как настоящая', () => {
      const session = createSession(gameContent);
      talk(session, { x: 5, y: 8 });
      talk(session, { x: 19, y: 14 });
      session.cheatWinMinigame();
      expect(session.quests.status('first_steps')).toBe('completed');
      expect(session.hasWonMinigame('harvest')).toBe(true);
      const mode = session.mode;
      expect(mode.kind === 'minigame' && mode.phase).toBe('finished');
    });

    it('победа в бою, все карты, квесты, порталы и телепорт', () => {
      const session = createSession(gameContent);
      const events = record(session);

      session.cheatGrantAllCards();
      expect(Object.keys(gameContent.cards).every((cardId) => session.cards.count(cardId) >= 2)).toBe(true);

      talk(session, { x: 5, y: 8 });
      session.cheatCompleteQuests();
      expect(session.quests.status('first_steps')).toBe('completed');

      place(session, { x: 27, y: 8 });
      expect(session.world.level.id).toBe('submarine');
      place(session, { x: 29, y: 4 });
      expect(session.world.level.id).toBe('submarine');
      skipDialog(session);
      session.update(16, idle);
      session.cheatSetPortalsOpen(true);
      place(session, { x: 28, y: 4 });
      place(session, { x: 29, y: 4 });
      expect(session.world.level.id).toBe('castle');

      session.leaveScene();
      session.cheatTeleport('station');
      expect(session.world.level.id).toBe('station');
      expect(events).toContainEqual({ type: 'levelChanged', levelId: 'station' });

      session.cheatTeleport('castle');
      talk(session, { x: 10, y: 2 });
      expect(session.mode.kind).toBe('battle');
      session.cheatWinBattle();
      expect(events).toContainEqual({ type: 'battleFinished', bossId: 'keeper', won: true });
      session.leaveBattle();
      expect(session.check([{ type: 'bossDefeated', bossId: 'keeper', value: true }])).toBe(true);
    });
  });

  describe('таблички и сундуки', () => {
    it('табличка показывает текст и не влияет на квесты', () => {
      const session = createSession(gameContent);
      place(session, { x: 2, y: 8 });
      expect(session.interactionPrompt()).toMatchObject({ verb: 'прочитать', name: 'Табличка' });
      session.interact();
      const mode = session.mode;
      expect(mode.kind === 'dialog' && mode.dialog.speaker).toBe('Табличка');
      skipDialog(session);
      expect(session.mode.kind).toBe('world');
      expect(session.quests.list()).toEqual([]);
    });

    it('сундук предлагает выбор, выдаёт одну карту и больше не открывается', () => {
      const session = createSession(gameContent);
      const events = record(session);
      place(session, { x: 25, y: 3 });
      expect(session.interactionPrompt()).toMatchObject({ verb: 'открыть', name: 'Сундук', at: { x: 25, y: 2 } });
      session.interact();
      const mode = session.mode;
      if (mode.kind !== 'reward') throw new Error(`ожидался выбор награды, а не ${mode.kind}`);
      expect(mode.options).toEqual(['viper', 'reaper', 'feast']);

      session.chooseReward(99);
      expect(session.mode.kind).toBe('reward');
      session.chooseReward(2);
      expect(session.mode.kind).toBe('world');
      expect(session.cards.count('feast')).toBe(1);
      expect(session.cards.count('reaper')).toBe(2);
      expect(events).toContainEqual({ type: 'cardsGranted', cardIds: ['feast'] });

      expect(session.isChestOpened('pond_chest')).toBe(true);
      expect(session.interactionPrompt()).toBeNull();
      session.interact();
      expect(session.mode.kind).toBe('world');
    });

    it('сундук с guaranteed выдаёт выбранную карту вместе с гарантированной', () => {
      const session = createSession(gameContent);
      place(session, { x: 9, y: 7 });
      session.interact();
      skipDialog(session);
      place(session, { x: 20, y: 3 });
      session.interact();
      const mode = session.mode;
      if (mode.kind !== 'reward') throw new Error(`ожидался выбор награды, а не ${mode.kind}`);
      expect(mode.options).toEqual(['bull', 'viper', 'hive']);
      session.chooseReward(0);
      expect(session.mode.kind).toBe('world');
      expect(session.cards.count('bull')).toBe(1);
      expect(session.cards.count('shard_of_dawn')).toBe(1);
    });

    it('от выбора можно отказаться — сундук останется закрытым', () => {
      const session = createSession(gameContent);
      place(session, { x: 25, y: 3 });
      session.interact();
      session.declineReward();
      expect(session.mode.kind).toBe('world');
      expect(session.isChestOpened('pond_chest')).toBe(false);
      expect(session.cards.total).toBe(8);
    });

    it('открытые сундуки сохраняются, причём отдельно для каждого уровня', () => {
      const session = createSession(gameContent);
      place(session, { x: 25, y: 3 });
      session.interact();
      session.chooseReward(0);
      const save = session.serialize();
      expect(save.openedChests).toEqual(['meadow:pond_chest']);

      const restored = GameSession.restore(gameContent, save);
      expect(restored.isChestOpened('pond_chest')).toBe(true);
      restored.cheatTeleport('submarine');
      expect(restored.isChestOpened('stern_chest')).toBe(false);
    });
  });

  describe('двери и рычаги', () => {
    it('рычаг открывает дверь, которая была непроходима', () => {
      const session = createSession(gameContent);
      place(session, { x: 20, y: 4 });
      expect(session.world.findInteractable()).toBeUndefined();
      expect(session.isDoorOpen('garden_door')).toBe(false);

      place(session, { x: 9, y: 7 });
      expect(session.interactionPrompt()).toMatchObject({ verb: 'потянуть', name: 'Рычаг' });
      session.interact();
      skipDialog(session);
      expect(session.isDoorOpen('garden_door')).toBe(true);
      expect(session.interactionPrompt()).toBeNull();

      place(session, { x: 20, y: 3 });
      expect(session.interactionPrompt()).toMatchObject({ verb: 'открыть', name: 'Сундук' });
    });

    it('открытая дверь сохраняется и восстанавливается, отдельно для каждого уровня', () => {
      const session = createSession(gameContent);
      place(session, { x: 9, y: 7 });
      session.interact();
      skipDialog(session);
      const save = session.serialize();
      expect(save.openedDoors).toEqual(['meadow:garden_door']);

      const restored = GameSession.restore(gameContent, save);
      expect(restored.isDoorOpen('garden_door')).toBe(true);
      restored.cheatTeleport('submarine');
      restored.cheatTeleport('meadow');
      expect(restored.isDoorOpen('garden_door')).toBe(true);
    });
  });

  describe('торговец и монеты', () => {
    const winHarvest = (session: GameSession): void => {
      place(session, { x: 19, y: 14 });
      session.interact();
      skipDialog(session);
      winMinigame(session);
    };

    it('победа в мини-игре приносит монеты каждый раз, а не только за первую', () => {
      const session = createSession(gameContent, { seed: 3 });
      expect(session.coins).toBe(0);
      talk(session, { x: 5, y: 8 });

      winHarvest(session);
      expect(session.coins).toBe(10);
      session.interact();
      expect(session.mode.kind).toBe('reward');
      takeChoice(session);
      expect(session.mode.kind).toBe('world');

      winHarvest(session);
      expect(session.coins).toBe(20);
      session.interact();
      expect(session.mode.kind).toBe('world');
    });

    it('у торговца можно купить карту, пока хватает монет', () => {
      const session = createSession(gameContent, { seed: 3 });
      talk(session, { x: 5, y: 8 });
      winHarvest(session);
      session.interact();
      takeChoice(session);
      winHarvest(session);
      session.interact();
      expect(session.coins).toBe(20);

      talk(session, { x: 23, y: 12 });
      expect(session.mode.kind).toBe('trade');
      expect(session.buyCard(2)).toEqual({ ok: false, reason: 'Не хватает монет' });
      expect(session.buyCard(1)).toEqual({ ok: true });
      expect(session.coins).toBe(8);
      expect(session.cards.count('ghost')).toBe(1);
      // Лавка не закрывается после покупки — можно взять ещё, пока хватает монет.
      expect(session.mode.kind).toBe('trade');
      expect(session.buyCard(0)).toEqual({ ok: false, reason: 'Не хватает монет' });

      session.leaveTrade();
      expect(session.mode.kind).toBe('world');
    });

    it('монеты сохраняются и восстанавливаются', () => {
      const session = createSession(gameContent, { seed: 3 });
      talk(session, { x: 5, y: 8 });
      winHarvest(session);
      const save = session.serialize();
      expect(save.coins).toBe(10);
      const restored = GameSession.restore(gameContent, save);
      expect(restored.coins).toBe(10);
    });

    const earnCoins = (session: GameSession, times: number): void => {
      talk(session, { x: 5, y: 8 });
      for (let i = 0; i < times; i++) {
        winHarvest(session);
        session.interact();
        takeChoice(session);
      }
    };

    it('артефакт у торговца покупается за монеты и не продаётся дважды', () => {
      const session = createSession(gameContent, { seed: 3 });
      earnCoins(session, 3);
      expect(session.coins).toBe(30);

      talk(session, { x: 23, y: 12 });
      expect(session.mode.kind).toBe('trade');
      expect(session.artifacts().find((entry) => entry.def.id === 'mage_glove')?.owned).toBe(false);
      expect(session.buyArtifact(1)).toEqual({ ok: true }); // «Перчатка мага», 25 монет
      expect(session.coins).toBe(5);
      expect(session.artifacts().find((entry) => entry.def.id === 'mage_glove')?.owned).toBe(true);
      expect(session.buyArtifact(1)).toEqual({ ok: false, reason: 'Этот артефакт уже найден' });
      expect(session.buyArtifact(0)).toEqual({ ok: false, reason: 'Не хватает монет' });
    });

    it('экипировать можно только найденный артефакт; его можно снять', () => {
      const session = createSession(gameContent, { seed: 3 });
      expect(session.equipArtifact('mage_glove')).toEqual({ ok: false, reason: 'Артефакт ещё не найден' });

      earnCoins(session, 3);
      talk(session, { x: 23, y: 12 });
      session.buyArtifact(1);
      session.leaveTrade();

      expect(session.equipArtifact('mage_glove')).toEqual({ ok: true });
      expect(session.artifacts().find((entry) => entry.def.id === 'mage_glove')?.equipped).toBe(true);
      expect(session.equipArtifact(null)).toEqual({ ok: true });
      expect(session.artifacts().every((entry) => !entry.equipped)).toBe(true);
    });

    // Порядок предложений торговки Лины: amulet_vitality, mage_glove, fury_belt.
    const ARTIFACT_OFFER_INDEX: Record<string, number> = { amulet_vitality: 0, mage_glove: 1, fury_belt: 2 };

    const equipArtifactInBattle = (artifactId: string): GameSession => {
      const keeper = new ContentRegistry(gameContent).boss('keeper');
      const session = createSession(
        { ...gameContent, bosses: { ...gameContent.bosses, keeper: { ...keeper, health: 1 } } },
        { seed: 5 },
      );
      earnCoins(session, 3);
      talk(session, { x: 23, y: 12 });
      session.buyArtifact(ARTIFACT_OFFER_INDEX[artifactId] as number);
      session.leaveTrade();
      session.equipArtifact(artifactId);

      session.world.loadLevel('castle');
      session.quests.start('final_game');
      session.quests.handle({ type: 'levelEntered', levelId: 'castle' });
      place(session, { x: 10, y: 2 });
      session.interact();
      skipDialog(session);
      return session;
    };

    it('«Перчатка мага» удешевляет силу героя в бою, не опускаясь ниже 1', () => {
      const session = equipArtifactInBattle('mage_glove');
      const mode = session.mode;
      if (mode.kind !== 'battle') throw new Error(`ожидался бой, а не ${mode.kind}`);
      expect(mode.battle.snapshot().sides.player.power?.cost).toBe(1);
    });

    it('«Амулет стойкости» добавляет здоровье герою на начало боя', () => {
      const session = equipArtifactInBattle('amulet_vitality');
      const mode = session.mode;
      if (mode.kind !== 'battle') throw new Error(`ожидался бой, а не ${mode.kind}`);
      expect(mode.battle.snapshot().sides.player.hero.maxHealth).toBe(gameContent.player.heroHealth + 4);
    });

    it('«Пояс ярости» увеличивает прирост ярости за атаку в бою', () => {
      const session = equipArtifactInBattle('fury_belt');
      const mode = session.mode;
      if (mode.kind !== 'battle') throw new Error(`ожидался бой, а не ${mode.kind}`);
      expect(mode.battle.snapshot().sides.player.rageGainBonus).toBe(1);
    });

    it('без артефакта сила героя и здоровье — как в контенте', () => {
      const keeper = new ContentRegistry(gameContent).boss('keeper');
      const session = createSession(
        { ...gameContent, bosses: { ...gameContent.bosses, keeper: { ...keeper, health: 1 } } },
        { seed: 5 },
      );
      session.world.loadLevel('castle');
      session.quests.start('final_game');
      session.quests.handle({ type: 'levelEntered', levelId: 'castle' });
      place(session, { x: 10, y: 2 });
      session.interact();
      skipDialog(session);
      const mode = session.mode;
      if (mode.kind !== 'battle') throw new Error(`ожидался бой, а не ${mode.kind}`);
      expect(mode.battle.snapshot().sides.player.hero.maxHealth).toBe(gameContent.player.heroHealth);
      expect(mode.battle.snapshot().sides.player.power?.cost).toBe(gameContent.player.power?.cost);
      expect(mode.battle.snapshot().sides.player.rageGainBonus).toBe(0);
    });
  });
});
