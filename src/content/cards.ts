import type { CardDef, CardEffect, CardKeyword, CardRarity } from '@core/content/types';

const unit = (
  id: string,
  name: string,
  setting: string,
  cost: number,
  attack: number,
  health: number,
  rarity: CardRarity,
  text: string,
  keywords: CardKeyword[] = [],
  onPlay?: CardEffect,
  onDeath?: CardEffect,
  aura?: { attack: number },
): CardDef => ({
  id, type: 'unit', name, setting, cost, attack, health, rarity, text, keywords,
  ...(aura ? { aura } : {}),
  ...(onPlay ? { onPlay } : {}),
  ...(onDeath ? { onDeath } : {}),
});

const spell = (
  id: string,
  name: string,
  setting: string,
  cost: number,
  rarity: CardRarity,
  text: string,
  effect: CardEffect,
): CardDef => ({ id, type: 'spell', name, setting, cost, rarity, text, effect });

const list: CardDef[] = [
  // Поля
  unit('sprout', 'Росток', 'fields', 1, 1, 2, 'common', 'Маленький, но упрямый.'),
  unit('scarecrow', 'Пугало', 'fields', 2, 1, 4, 'common', 'Защитник: враги обязаны бить его первым.', ['guard']),
  unit('fox', 'Лисица', 'fields', 2, 3, 1, 'common', 'Рывок: атакует сразу.', ['charge']),
  unit('reaper', 'Жнец', 'fields', 3, 3, 3, 'common', 'Надёжный работник поля.'),
  unit('bull', 'Бык', 'fields', 4, 4, 5, 'rare', 'Лучше не стоять у него на пути.'),
  spell('feast', 'Пир урожая', 'fields', 2, 'common', 'Лечит героя на 4.', { type: 'healHero', amount: 4 }),
  unit('viper', 'Гадюка', 'fields', 2, 1, 2, 'rare', 'Яд: убивает любое существо, которое ранит.', ['poison']),
  unit('hive', 'Дикий рой', 'fields', 1, 2, 1, 'common', 'Рывок: жалит сразу, но долго не живёт.', ['charge']),
  unit('shard_of_dawn', 'Осколок рассвета', 'fields', 3, 3, 4, 'legendary', 'Хранит тепло первого рассвета. При выходе: лечит героя на 2.', [], { type: 'healHero', amount: 2 }),
  // Подводная лодка
  unit('crab', 'Краб-механик', 'submarine', 2, 2, 3, 'common', 'При выходе: лечит героя на 2.', [], { type: 'healHero', amount: 2 }),
  unit('torpedo', 'Торпеда', 'submarine', 3, 4, 1, 'rare', 'Рывок: атакует сразу.', ['charge']),
  unit('diver', 'Водолаз', 'submarine', 3, 2, 5, 'rare', 'Защитник в тяжёлом скафандре.', ['guard']),
  unit('kraken', 'Кракен', 'submarine', 6, 6, 7, 'epic', 'Древний ужас глубин.'),
  unit('mine', 'Морская мина', 'submarine', 3, 0, 3, 'rare', 'Защитник. При гибели: 1 урон всем существам врага.', ['guard'], undefined, { type: 'damageAllEnemies', amount: 1 }),
  spell('harpoon', 'Гарпун', 'submarine', 2, 'common', '3 урона выбранной цели.', { type: 'damageTarget', amount: 3 }),
  spell('depth_charge', 'Глубинная бомба', 'submarine', 3, 'rare', '2 урона всем существам врага.', { type: 'damageAllEnemies', amount: 2 }),
  unit('jellyfish', 'Медуза', 'submarine', 3, 2, 2, 'rare', 'Яд: убивает любое существо, которое ранит.', ['poison']),
  unit('shard_of_depth', 'Осколок глубины', 'submarine', 3, 2, 6, 'legendary', 'Беззвучно опускается на дно и ждёт.', ['guard']),
  // Замок
  unit('squire', 'Оруженосец', 'castle', 1, 2, 1, 'common', 'Рвётся в бой раньше рыцаря.'),
  unit('archer', 'Лучница', 'castle', 2, 3, 2, 'common', 'При выходе: 1 урона герою врага.', [], { type: 'damageEnemyHero', amount: 1 }),
  unit('knight', 'Рыцарь', 'castle', 4, 4, 4, 'rare', 'Защитник замковых ворот.', ['guard']),
  unit('gargoyle', 'Горгулья', 'castle', 5, 5, 6, 'epic', 'Каменный защитник.', ['guard']),
  unit('shadow', 'Тень Хранителя', 'castle', 7, 7, 7, 'legendary', 'Рывок: атакует сразу.', ['charge']),
  unit('ghost', 'Призрак', 'castle', 2, 2, 1, 'common', 'При гибели: возьми карту.', [], undefined, { type: 'draw', count: 1 }),
  spell('blessing', 'Благословение', 'castle', 2, 'common', 'Твоё существо получает +2/+2.', { type: 'buffTarget', attack: 2, health: 2 }),
  spell('banner', 'Королевское знамя', 'castle', 3, 'rare', 'Твои существа получают +1/+1.', { type: 'buffAllies', attack: 1, health: 1 }),
  unit('standard_bearer', 'Знаменосец', 'castle', 3, 1, 3, 'epic', 'Аура: остальные твои существа получают +1 к атаке.', [], undefined, undefined, { attack: 1 }),
  unit('paladin', 'Паладин', 'castle', 3, 3, 3, 'rare', 'Щит: гасит первый полученный удар.', ['shield']),
  unit('warden', 'Страж каземата', 'castle', 5, 3, 6, 'legendary', 'Защитник. Яд: убивает любое существо, которое ранит.', ['guard', 'poison']),
  unit('shard_of_dusk', 'Осколок сумрака', 'castle', 3, 4, 3, 'legendary', 'При гибели: 2 урона герою врага.', [], undefined, { type: 'damageEnemyHero', amount: 2 }),
  // Космос
  unit('drone', 'Дрон', 'space', 1, 1, 1, 'common', 'Рывок: атакует сразу.', ['charge']),
  unit('astronaut', 'Астронавт', 'space', 2, 2, 3, 'common', 'Первым выходит в открытый космос.'),
  unit('turret', 'Лазерная турель', 'space', 3, 4, 2, 'rare', 'Стреляет точно, ломается быстро.'),
  unit('shield', 'Щитовой модуль', 'space', 3, 1, 6, 'rare', 'Защитник станции.', ['guard']),
  unit('comet', 'Комета', 'space', 4, 5, 2, 'epic', 'Рывок: атакует сразу.', ['charge']),
  unit('titan', 'Звёздный титан', 'space', 8, 8, 8, 'legendary', 'Защитник размером с луну.', ['guard']),
  unit('barrier', 'Силовой барьер', 'space', 2, 1, 3, 'rare', 'Защитник со щитом.', ['guard', 'shield']),
  spell('laser', 'Лазерный луч', 'space', 3, 'rare', '4 урона выбранной цели.', { type: 'damageTarget', amount: 4 }),
  spell('star_map', 'Звёздная карта', 'space', 2, 'common', 'Возьми 2 карты.', { type: 'draw', count: 2 }),
  spell('meteor', 'Метеор', 'space', 4, 'epic', '5 урона герою врага.', { type: 'damageEnemyHero', amount: 5 }),
  spell('shard_of_void', 'Осколок пустоты', 'space', 3, 'legendary', '2 урона всем существам врага.', { type: 'damageAllEnemies', amount: 2 }),
  // Пещеры
  unit('crystal_bat', 'Кристальная летучая мышь', 'caves', 1, 2, 1, 'common', 'Рывок: атакует сразу.', ['charge']),
  unit('cave_lurker', 'Пещерный хищник', 'caves', 2, 2, 3, 'common', 'Таится в темноте, пока не разглядишь.'),
  unit('golem_shard', 'Осколок голема', 'caves', 3, 2, 5, 'rare', 'Защитник из обломков голема.', ['guard']),
  spell('stalactite_trap', 'Ловушка со сталактитами', 'caves', 2, 'rare', '4 урона выбранной цели.', { type: 'damageTarget', amount: 4 }),
  spell('cave_in', 'Обвал', 'caves', 3, 'rare', '3 урона всем существам врага.', { type: 'damageAllEnemies', amount: 3 }),
  spell('echo', 'Эхо', 'caves', 2, 'common', 'Возьми 2 карты.', { type: 'draw', count: 2 }),
  unit('golem_heart', 'Сердце голема', 'caves', 4, 2, 10, 'legendary', 'Бьётся медленно, но держит удар за двоих.', ['guard']),
  unit('shard_of_stone', 'Осколок камня', 'caves', 3, 2, 7, 'legendary', 'Защитник. Твёрже самого камня.', ['guard']),
];

export const cards: Record<string, CardDef> = Object.fromEntries(list.map((card) => [card.id, card]));
