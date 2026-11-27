import type { GameContent } from '../content/types';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
}

export interface AchievementView extends AchievementDef {
  done: boolean;
}

export interface AchievementState {
  defeatedBosses: ReadonlySet<string>;
  wonMinigames: ReadonlySet<string>;
  ownedCardIds: ReadonlySet<string>;
  hasLostBattle: boolean;
}

interface AchievementEntry extends AchievementDef {
  isDone: (state: AchievementState) => boolean;
}

const buildEntries = (content: GameContent): AchievementEntry[] => {
  const bossIds = Object.keys(content.bosses);
  const minigameIds = Object.keys(content.minigames);
  const finalBoss = Object.values(content.bosses).find((boss) => boss.finale);

  const entries: AchievementEntry[] = [
    {
      id: 'no_defeats',
      title: 'Без единого поражения',
      description: 'Пройти игру до конца, ни разу не проиграв и не сдавшись в бою.',
      isDone: (state) => !state.hasLostBattle && (finalBoss ? state.defeatedBosses.has(finalBoss.id) : false),
    },
    {
      id: 'all_bosses',
      title: 'Победитель всех боссов',
      description: 'Победить каждого босса игры.',
      isDone: (state) => bossIds.length > 0 && bossIds.every((id) => state.defeatedBosses.has(id)),
    },
    {
      id: 'all_minigames',
      title: 'Знаток мини-игр',
      description: 'Выиграть каждую мини-игру хотя бы по разу.',
      isDone: (state) => minigameIds.length > 0 && minigameIds.every((id) => state.wonMinigames.has(id)),
    },
  ];

  for (const setting of Object.values(content.settings)) {
    const cardIds = Object.values(content.cards)
      .filter((card) => card.setting === setting.id)
      .map((card) => card.id);
    if (cardIds.length === 0) continue;
    entries.push({
      id: `collection_${setting.id}`,
      title: `Коллекционер: ${setting.name}`,
      description: `Собрать все карты сеттинга «${setting.name}» (${cardIds.length}).`,
      isDone: (state) => cardIds.every((id) => state.ownedCardIds.has(id)),
    });
  }

  return entries;
};

/** Список достижений с описаниями — порядок и состав не зависят от прогресса игрока. */
export const achievementDefs = (content: GameContent): AchievementDef[] =>
  buildEntries(content).map(({ isDone: _isDone, ...def }) => def);

/** id достижений, условия которых выполнены прямо сейчас. */
export const evaluateAchievements = (content: GameContent, state: AchievementState): ReadonlySet<string> =>
  new Set(buildEntries(content).filter((entry) => entry.isDone(state)).map((entry) => entry.id));
