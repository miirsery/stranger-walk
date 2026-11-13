import type { BossDef } from '@core/content/types';

export const bosses: Record<string, BossDef> = {
  keeper: {
    id: 'keeper',
    name: 'Хранитель Колоды',
    title: 'Повелитель замка',
    setting: 'castle',
    health: 22,
    music: 'battle',
    deck: [
      'squire', 'squire', 'archer', 'archer', 'ghost', 'ghost',
      'knight', 'knight', 'gargoyle', 'gargoyle', 'banner', 'shadow',
    ],
    rewardCards: ['gargoyle', 'banner', 'ghost', 'astronaut'],
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
    health: 44,
    music: 'battle',
    deck: [
      'archer', 'archer', 'fox', 'fox', 'torpedo', 'torpedo', 'turret', 'turret',
      'comet', 'comet', 'meteor', 'meteor', 'laser', 'laser', 'bull', 'bull', 'titan',
    ],
    rewardCards: ['comet', 'laser', 'star_map', 'meteor', 'turret'],
    winLines: ['Чистая победа. Карты твои — и звёздные карты тоже.', 'Продолжение следует…'],
    loseLines: ['В космосе никто не услышит, как ты сдаёшься. Попробуй ещё.'],
  },
};
