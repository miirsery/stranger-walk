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
      'knight', 'knight', 'gargoyle', 'gargoyle', 'banner', 'shadow',
    ],
    rewardCards: ['gargoyle', 'banner', 'astronaut', 'turret'],
    winLines: ['Невозможно… Моя колода повержена.', 'Забирай карты, Странник. Миры снова открыты.'],
    loseLines: ['Слабо. Возвращайся, когда соберёшь колоду получше.'],
  },
  void_captain: {
    id: 'void_captain',
    name: 'Капитан Пустоты',
    title: 'Хозяин станции «Горизонт»',
    setting: 'space',
    // Здоровье и быстрая колода подобраны симуляцией (см. balance.test.ts):
    // прежний вариант с 25 здоровья проигрывал собранной колоде игрока в 87% боёв.
    health: 35,
    music: 'battle',
    deck: [
      'drone', 'drone', 'archer', 'archer', 'astronaut', 'astronaut', 'torpedo', 'torpedo',
      'turret', 'turret', 'comet', 'comet', 'meteor', 'meteor', 'shield', 'titan',
    ],
    rewardCards: ['comet', 'meteor', 'star_map'],
    winLines: ['Чистая победа. Карты твои — и звёздные карты тоже.', 'Продолжение следует…'],
    loseLines: ['В космосе никто не услышит, как ты сдаёшься. Попробуй ещё.'],
  },
};
