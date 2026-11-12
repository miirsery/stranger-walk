import { describe, expect, it } from 'vitest';
import type { QuestDef } from '../content/types';
import { QuestLog } from './questLog';

const defs: Record<string, QuestDef> = {
  help: {
    id: 'help',
    title: 'Помощь',
    description: '',
    objectives: [
      { id: 'talk', text: 'Поговорить', type: 'talkTo', npcId: 'bob' },
      { id: 'win', text: 'Выиграть', type: 'winMinigame', minigameId: 'game' },
    ],
    rewardCards: ['card'],
  },
  boss: {
    id: 'boss',
    title: 'Босс',
    description: '',
    objectives: [
      { id: 'enter', text: 'Войти', type: 'enterLevel', levelId: 'castle' },
      { id: 'defeat', text: 'Победить', type: 'defeatBoss', bossId: 'king' },
    ],
    rewardCards: [],
  },
};

const createLog = (): QuestLog =>
  new QuestLog((id) => {
    const def = defs[id];
    if (!def) throw new Error(`нет квеста ${id}`);
    return def;
  });

describe('QuestLog', () => {
  it('квест неактивен, пока не взят, и берётся только один раз', () => {
    const log = createLog();
    expect(log.status('help')).toBe('inactive');
    expect(log.start('help')).toBe(true);
    expect(log.start('help')).toBe(false);
    expect(log.status('help')).toBe('active');
  });

  it('игнорирует события для невзятых квестов', () => {
    const log = createLog();
    expect(log.handle({ type: 'npcTalked', npcId: 'bob' })).toEqual({ updated: [], completed: [] });
    log.start('help');
    expect(log.list()[0]?.objectives.every((objective) => !objective.done)).toBe(true);
  });

  it('отмечает цели и завершает квест, когда выполнены все', () => {
    const log = createLog();
    log.start('help');
    const first = log.handle({ type: 'npcTalked', npcId: 'bob' });
    expect(first.updated.map((quest) => quest.id)).toEqual(['help']);
    expect(first.completed).toEqual([]);
    expect(log.list()[0]?.objectives.map((objective) => objective.done)).toEqual([true, false]);

    expect(log.handle({ type: 'npcTalked', npcId: 'alice' }).updated).toEqual([]);

    const second = log.handle({ type: 'minigameWon', minigameId: 'game' });
    expect(second.completed.map((quest) => quest.id)).toEqual(['help']);
    expect(log.status('help')).toBe('completed');
  });

  it('завершённый квест больше не реагирует на события', () => {
    const log = createLog();
    log.start('boss');
    log.handle({ type: 'levelEntered', levelId: 'castle' });
    log.handle({ type: 'bossDefeated', bossId: 'king' });
    expect(log.status('boss')).toBe('completed');
    expect(log.handle({ type: 'bossDefeated', bossId: 'king' })).toEqual({ updated: [], completed: [] });
  });
});
