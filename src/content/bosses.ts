import type { BossDef } from '@core/content/types';

export const bosses: Record<string, BossDef> = {
  keeper: {
    id: 'keeper',
    name: 'Хранитель Колоды',
    title: 'Повелитель замка',
    setting: 'castle',
    health: 20,
    music: 'battle',
    deck: [
      'squire', 'squire', 'archer', 'archer', 'crab', 'crab',
      'knight', 'knight', 'gargoyle', 'gargoyle', 'reaper', 'shadow',
    ],
    rewardCards: ['gargoyle'],
    winLines: ['Невозможно… Моя колода повержена.', 'Забирай карты, Странник. Миры снова открыты.'],
    loseLines: ['Слабо. Возвращайся, когда соберёшь колоду получше.'],
  },
};
