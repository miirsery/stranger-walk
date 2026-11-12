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
): CardDef => ({ id, type: 'unit', name, setting, cost, attack, health, rarity, text, keywords, ...(onPlay ? { onPlay } : {}) });

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
  // Подводная лодка
  unit('crab', 'Краб-механик', 'submarine', 2, 2, 3, 'common', 'При выходе: лечит героя на 2.', [], { type: 'healHero', amount: 2 }),
  unit('torpedo', 'Торпеда', 'submarine', 3, 4, 1, 'rare', 'Рывок: атакует сразу.', ['charge']),
  unit('diver', 'Водолаз', 'submarine', 3, 2, 5, 'rare', 'Защитник в тяжёлом скафандре.', ['guard']),
  unit('kraken', 'Кракен', 'submarine', 6, 6, 7, 'epic', 'Древний ужас глубин.'),
  spell('depth_charge', 'Глубинная бомба', 'submarine', 3, 'rare', '2 урона всем существам врага.', { type: 'damageAllEnemies', amount: 2 }),
  // Замок
  unit('squire', 'Оруженосец', 'castle', 1, 2, 1, 'common', 'Рвётся в бой раньше рыцаря.'),
  unit('archer', 'Лучница', 'castle', 2, 3, 2, 'common', 'При выходе: 1 урона герою врага.', [], { type: 'damageEnemyHero', amount: 1 }),
  unit('knight', 'Рыцарь', 'castle', 4, 4, 4, 'rare', 'Защитник замковых ворот.', ['guard']),
  unit('gargoyle', 'Горгулья', 'castle', 5, 5, 6, 'epic', 'Каменный защитник.', ['guard']),
  unit('shadow', 'Тень Хранителя', 'castle', 7, 7, 7, 'legendary', 'Рывок: атакует сразу.', ['charge']),
  spell('banner', 'Королевское знамя', 'castle', 3, 'rare', 'Твои существа получают +1/+1.', { type: 'buffAllies', attack: 1, health: 1 }),
  // Космос
  unit('drone', 'Дрон', 'space', 1, 1, 1, 'common', 'Рывок: атакует сразу.', ['charge']),
  unit('astronaut', 'Астронавт', 'space', 2, 2, 3, 'common', 'Первым выходит в открытый космос.'),
  unit('turret', 'Лазерная турель', 'space', 3, 4, 2, 'rare', 'Стреляет точно, ломается быстро.'),
  unit('shield', 'Щитовой модуль', 'space', 3, 1, 6, 'rare', 'Защитник станции.', ['guard']),
  unit('comet', 'Комета', 'space', 4, 5, 2, 'epic', 'Рывок: атакует сразу.', ['charge']),
  unit('titan', 'Звёздный титан', 'space', 8, 8, 8, 'legendary', 'Защитник размером с луну.', ['guard']),
  spell('star_map', 'Звёздная карта', 'space', 2, 'common', 'Возьми 2 карты.', { type: 'draw', count: 2 }),
  spell('meteor', 'Метеор', 'space', 4, 'epic', '5 урона герою врага.', { type: 'damageEnemyHero', amount: 5 }),
];

export const cards: Record<string, CardDef> = Object.fromEntries(list.map((card) => [card.id, card]));
