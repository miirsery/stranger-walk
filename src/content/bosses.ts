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
    rewardCards: ['gargoyle', 'astronaut', 'turret'],
    winLines: ['Невозможно… Моя колода повержена.', 'Забирай карты, Странник. Миры снова открыты.'],
    loseLines: ['Слабо. Возвращайся, когда соберёшь колоду получше.'],
  },
  void_captain: {
    id: 'void_captain',
    name: 'Капитан Пустоты',
    title: 'Хозяин станции «Горизонт»',
    setting: 'space',
    health: 25,
    music: 'battle',
    deck: [
      'drone', 'drone', 'astronaut', 'astronaut', 'turret', 'turret',
      'shield', 'shield', 'comet', 'comet', 'knight', 'kraken', 'titan',
    ],
    rewardCards: ['comet', 'shield'],
    winLines: ['Чистая победа. Карты твои — и звёздные карты тоже.', 'Продолжение следует…'],
    loseLines: ['В космосе никто не услышит, как ты сдаёшься. Попробуй ещё.'],
  },
};
