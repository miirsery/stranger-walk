import type { BossDef } from '@core/content/types';

export const bosses: Record<string, BossDef> = {
  keeper: {
    id: 'keeper',
    name: 'Хранитель Колоды',
    title: 'Повелитель замка',
    lore:
      'Когда-то именно он собрал колоду, связавшую луга, глубины, замок и звёзды, — и сам же разделил её на части, ' +
      'заперев мир на замок. На троне он почти не двигается: вся его сила — в картах на столе и в приказах, ' +
      'которые делают их крепче с каждым ходом.',
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
  casemate_warden: {
    id: 'casemate_warden',
    name: 'Страж каземата',
    title: 'Забытый часовой',
    lore:
      'Ни один квест не ведёт сюда — Хранитель давно забыл, кого запер в нижнем каземате. ' +
      'Страж не помнит, за что его оставили охранять пустую камеру, но правило помнит крепко: ' +
      'прохода без боя не будет.',
    setting: 'castle',
    health: 32,
    ai: 'smart',
    power: {
      name: 'Клятва стража',
      text: 'Все существа стража получают +2 к здоровью.',
      cost: 2,
      effect: { type: 'buffAllies', attack: 0, health: 2 },
    },
    music: 'battle',
    deck: [
      'squire', 'squire', 'archer', 'archer', 'ghost', 'ghost',
      'knight', 'knight', 'gargoyle', 'gargoyle', 'paladin', 'paladin',
      'blessing', 'banner',
    ],
    rewardCards: ['warden'],
    winLines: ['Клятва снята. Проходи, Странник — здесь больше нечего стеречь.', 'Забирай карту. Она твоя по праву победителя.'],
    loseLines: ['Камера не откроется. Возвращайся, когда колода будет крепче.'],
  },
  crystal_golem: {
    id: 'crystal_golem',
    name: 'Кристальный голем',
    title: 'Страж пещер',
    lore:
      'Никто не посылал Странника сюда — вход в пещеры скрыт в земле у Тихих лугов, и немногие ' +
      'вообще его находят. Голем сросся с кристаллами так давно, что уже не отличает себя от них: ' +
      'бьёт редко, но держит удар за двоих, а разбитые осколки тут же срастаются заново.',
    setting: 'caves',
    health: 28,
    power: {
      name: 'Каменная кожа',
      text: 'Существа голема получают +2 к здоровью.',
      cost: 2,
      effect: { type: 'buffAllies', attack: 0, health: 2 },
    },
    music: 'battle',
    deck: [
      'crystal_bat', 'crystal_bat', 'cave_lurker', 'cave_lurker',
      'golem_shard', 'golem_shard', 'stalactite_trap', 'stalactite_trap',
      'cave_in', 'cave_in', 'echo', 'echo',
    ],
    rewardCards: ['golem_heart', 'cave_in'],
    rewardChoices: ['stalactite_trap', 'echo', 'crystal_bat'],
    winLines: ['Кристаллы темнеют и осыпаются. Забирай осколок — он твой.', 'Тихо здесь. Было тихо и будет.'],
    loseLines: ['Камень не спешит. Возвращайся, когда станешь крепче.'],
  },
  void_captain: {
    id: 'void_captain',
    name: 'Капитан Пустоты',
    title: 'Хозяин станции «Горизонт»',
    lore:
      'Последний хранитель последней части колоды — звёздных карт, которые Хранитель Колоды проиграл ему давным-давно. ' +
      'Станция «Горизонт» — его территория и его оружие: залпы с орбиты бьют по герою издалека, пока капитан спокойно ' +
      'считает на несколько ходов вперёд.',
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
