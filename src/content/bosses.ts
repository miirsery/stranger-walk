import type { BossDef } from '@core/content/types';

export const bosses: Record<string, BossDef> = {
  keeper: {
    id: 'keeper',
    name: 'Хранитель Колоды',
    title: 'Повелитель замка',
    setting: 'castle',
    health: 26,
    power: {
      name: 'Приказ Хранителя',
      text: 'Его существа получают +1 к атаке.',
      cost: 2,
      effect: { type: 'buffAllies', attack: 1, health: 0 },
    },
    music: 'battle',
    deck: [
      'squire', 'squire', 'archer', 'archer', 'ghost', 'ghost',
      'knight', 'knight', 'gargoyle', 'gargoyle', 'banner', 'shadow',
    ],
    rewardCards: ['gargoyle', 'banner', 'ghost', 'astronaut'],
    rewardChoices: ['paladin', 'barrier', 'jellyfish'],
    winLines: ['Невозможно… Моя колода повержена.', 'Забирай карты, Странник. Миры снова открыты.'],
    loseLines: ['Слабо. Возвращайся, когда соберёшь колоду получше.'],
  },
  void_captain: {
    id: 'void_captain',
    name: 'Капитан Пустоты',
    title: 'Хозяин станции «Горизонт»',
    setting: 'space',
    // Играет «умным» ИИ: просчитывает ходы вперёд. Поэтому здоровья у него меньше,
    // чем у жадного варианта (было 48) — значение подобрано симуляцией (см. balance.test.ts).
    health: 24,
    ai: 'smart',
    power: {
      name: 'Орбитальный залп',
      text: '2 урона герою противника.',
      cost: 2,
      effect: { type: 'damageEnemyHero', amount: 2 },
    },
    music: 'battle',
    deck: [
      'archer', 'archer', 'fox', 'fox', 'torpedo', 'torpedo', 'turret', 'turret',
      'comet', 'comet', 'meteor', 'meteor', 'laser', 'laser', 'bull', 'bull', 'titan',
    ],
    rewardCards: ['comet', 'laser', 'star_map', 'meteor', 'turret'],
    rewardChoices: ['viper', 'paladin', 'barrier'],
    winLines: ['Чистая победа. Карты твои — и звёздные карты тоже.', 'Последняя часть колоды была у меня. Дороги между мирами открыты снова.'],
    loseLines: ['В космосе никто не услышит, как ты сдаёшься. Попробуй ещё.'],
    finale: {
      title: 'Эпилог. Возвращённая колода',
      lines: [
        'Станция «Горизонт» гаснет огнями — последние карты найдены, последняя партия сыграна.',
        'Странник раскладывает всю колоду на полу: поля, глубины, замок и звёзды снова лежат вместе, как было до того, как Хранитель их разделил.',
        'Дороги между мирами открываются одна за другой. Тихие луга, «Наутилус-8», замок и станция — теперь это просто соседние комнаты одного дома.',
        'Памяти о том, кем Странник был раньше, так и не вернулось. Но колода полна, а миры снова открыты — и, значит, путь того стоил.',
      ],
    },
  },
};
