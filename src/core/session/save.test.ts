import { describe, expect, it } from 'vitest';
import { gameContent } from '@content/index';
import { tileCenter } from '../world/tileMap';
import { GameSession } from './gameSession';
import { parseSave, SAVE_VERSION } from './save';

const idle = { x: 0, y: 0 };

/** Сессия с прогрессом: взят и частично выполнен квест, есть новые карты, другой уровень. */
const progressed = (): GameSession => {
  const session = new GameSession(gameContent);
  session.quests.start('first_steps');
  session.quests.handle({ type: 'npcTalked', npcId: 'farmer' });
  session.cards.add('bull');
  session.cards.add('kraken');
  session.cards.setDeck(session.cards.deck.filter((cardId) => cardId !== 'sprout'));
  session.world.loadLevel('submarine');
  const at = tileCenter({ x: 10, y: 5 });
  session.world.placePlayer(at.x, at.y, 'left');
  return session;
};

/** Сохранение, прошедшее через JSON, как при записи в хранилище. */
const roundTrip = (session: GameSession): unknown => JSON.parse(JSON.stringify(session.serialize()));

describe('сохранение прогресса', () => {
  it('восстанавливает уровень, позицию, квесты, карты и колоду', () => {
    const original = progressed();
    const save = parseSave(roundTrip(original));
    if (!save) throw new Error('сохранение не распознано');
    const restored = GameSession.restore(gameContent, save);

    expect(restored.mode.kind).toBe('world');
    expect(restored.world.level.id).toBe('submarine');
    expect(restored.world.player).toMatchObject({ ...tileCenter({ x: 10, y: 5 }), facing: 'left' });
    expect(restored.quests.list()).toEqual(original.quests.list());
    expect(restored.cards.list()).toEqual(original.cards.list());
    expect(restored.cards.deck).toEqual(original.cards.deck);
    expect(restored.cards.deck).not.toContain('sprout');
    expect(restored.serialize()).toEqual(original.serialize());
  });

  it('помнит побеждённых боссов и выигранные мини-игры', () => {
    const save = parseSave({ ...progressed().serialize(), defeatedBosses: ['keeper'], wonMinigames: ['harvest'] });
    if (!save) throw new Error('сохранение не распознано');
    const restored = GameSession.restore(gameContent, save);
    expect(restored.check([{ type: 'bossDefeated', bossId: 'keeper', value: true }])).toBe(true);
    expect(restored.serialize().wonMinigames).toEqual(['harvest']);
  });

  it('после загрузки игра продолжается: прогресс квеста двигается дальше', () => {
    const save = parseSave(roundTrip(progressed()));
    if (!save) throw new Error('сохранение не распознано');
    const restored = GameSession.restore(gameContent, save);
    restored.quests.handle({ type: 'minigameWon', minigameId: 'harvest' });
    expect(restored.quests.status('first_steps')).toBe('completed');
    restored.update(16, idle);
    expect(restored.mode.kind).toBe('world');
  });

  it('отбрасывает из сохранения то, чего больше нет в контенте', () => {
    const base = progressed().serialize();
    const save = parseSave({
      ...base,
      levelId: 'atlantis',
      quests: [...base.quests, { id: 'lost_quest', status: 'active', done: [] }],
      cards: { owned: { ...base.cards.owned, unicorn: 2 }, deck: [...base.cards.deck, 'unicorn'] },
      defeatedBosses: ['dragon'],
    });
    if (!save) throw new Error('сохранение не распознано');
    const restored = GameSession.restore(gameContent, save);
    expect(restored.world.level.id).toBe('meadow');
    expect(restored.quests.list().map((quest) => quest.def.id)).toEqual(['first_steps']);
    expect(restored.cards.count('unicorn')).toBe(0);
    expect(restored.cards.validateDeck(restored.cards.deck)).toEqual([]);
    expect(restored.serialize().defeatedBosses).toEqual([]);
  });

  it('позиция в стене заменяется точкой появления уровня', () => {
    const save = parseSave({ ...progressed().serialize(), player: { x: 1, y: 1, facing: 'up' } });
    if (!save) throw new Error('сохранение не распознано');
    const restored = GameSession.restore(gameContent, save);
    expect(restored.world.playerTile).toEqual({ x: 1, y: 2 });
  });

  it('parseSave отклоняет чужие и испорченные данные', () => {
    const valid = progressed().serialize();
    expect(parseSave(valid)).toEqual(valid);
    expect(parseSave(null)).toBeNull();
    expect(parseSave('save')).toBeNull();
    expect(parseSave({})).toBeNull();
    expect(parseSave({ ...valid, version: SAVE_VERSION + 1 })).toBeNull();
    expect(parseSave({ ...valid, player: { x: 'NaN', y: 0, facing: 'up' } })).toBeNull();
    expect(parseSave({ ...valid, player: { x: 0, y: 0, facing: 'north' } })).toBeNull();
    expect(parseSave({ ...valid, cards: { owned: { bull: -1 }, deck: [] } })).toBeNull();
    expect(parseSave({ ...valid, quests: [{ id: 'q', status: 'inactive', done: [] }] })).toBeNull();
    expect(parseSave({ ...valid, wonMinigames: [1, 2] })).toBeNull();
  });
});
