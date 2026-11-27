import { describe, expect, it } from 'vitest';
import { gameContent } from '@content/index';
import { achievementDefs, evaluateAchievements } from './achievements';

const emptyState = {
  defeatedBosses: new Set<string>(),
  wonMinigames: new Set<string>(),
  ownedCardIds: new Set<string>(),
  hasLostBattle: false,
};

describe('достижения', () => {
  it('список содержит по одному достижению на каждый сеттинг с картами плюс общие', () => {
    const defs = achievementDefs(gameContent);
    const settingsWithCards = new Set(Object.values(gameContent.cards).map((card) => card.setting));
    expect(defs).toHaveLength(3 + settingsWithCards.size);
    expect(new Set(defs.map((def) => def.id)).size).toBe(defs.length);
  });

  it('в пустом состоянии ничего не засчитано', () => {
    expect(evaluateAchievements(gameContent, emptyState).size).toBe(0);
  });

  it('«без поражений» засчитывается только после победы над финальным боссом без поражений', () => {
    const finalBoss = Object.values(gameContent.bosses).find((boss) => boss.finale);
    if (!finalBoss) throw new Error('в контенте нет финального босса');

    const won = evaluateAchievements(gameContent, { ...emptyState, defeatedBosses: new Set([finalBoss.id]) });
    expect(won.has('no_defeats')).toBe(true);

    const lostOnce = evaluateAchievements(gameContent, {
      ...emptyState,
      defeatedBosses: new Set([finalBoss.id]),
      hasLostBattle: true,
    });
    expect(lostOnce.has('no_defeats')).toBe(false);
  });

  it('«победитель всех боссов» и «знаток мини-игр» требуют полного набора', () => {
    const allBosses = Object.keys(gameContent.bosses);
    const allMinigames = Object.keys(gameContent.minigames);

    const partial = evaluateAchievements(gameContent, {
      ...emptyState,
      defeatedBosses: new Set(allBosses.slice(0, -1)),
      wonMinigames: new Set(allMinigames.slice(0, -1)),
    });
    expect(partial.has('all_bosses')).toBe(false);
    expect(partial.has('all_minigames')).toBe(false);

    const complete = evaluateAchievements(gameContent, {
      ...emptyState,
      defeatedBosses: new Set(allBosses),
      wonMinigames: new Set(allMinigames),
    });
    expect(complete.has('all_bosses')).toBe(true);
    expect(complete.has('all_minigames')).toBe(true);
  });

  it('коллекционер сеттинга засчитывается, когда собраны все его карты', () => {
    const bySetting = Object.values(gameContent.cards).reduce<Record<string, string[]>>((map, card) => {
      (map[card.setting] ??= []).push(card.id);
      return map;
    }, {});
    const entry = Object.entries(bySetting)[0];
    if (!entry) throw new Error('в контенте нет ни одной карты');
    const [settingId, cardIds] = entry;

    const partial = evaluateAchievements(gameContent, { ...emptyState, ownedCardIds: new Set(cardIds.slice(0, -1)) });
    expect(partial.has(`collection_${settingId}`)).toBe(false);

    const complete = evaluateAchievements(gameContent, { ...emptyState, ownedCardIds: new Set(cardIds) });
    expect(complete.has(`collection_${settingId}`)).toBe(true);
  });
});
