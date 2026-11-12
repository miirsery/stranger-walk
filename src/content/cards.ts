import type { CardDef, CardKeyword, CardRarity } from '@core/content/types';

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
): CardDef => ({ id, type: 'unit', name, setting, cost, attack, health, rarity, text, keywords });

const list: CardDef[] = [
  // Поля
  unit('sprout', 'Росток', 'fields', 1, 1, 2, 'common', 'Маленький, но упрямый.'),
  unit('scarecrow', 'Пугало', 'fields', 2, 1, 4, 'common', 'Защитник: враги обязаны бить его первым.', ['guard']),
  unit('fox', 'Лисица', 'fields', 2, 3, 1, 'common', 'Рывок: атакует сразу.', ['charge']),
  unit('reaper', 'Жнец', 'fields', 3, 3, 3, 'common', 'Надёжный работник поля.'),
  unit('bull', 'Бык', 'fields', 4, 4, 5, 'rare', 'Лучше не стоять у него на пути.'),
  // Подводная лодка
  unit('crab', 'Краб-механик', 'submarine', 2, 2, 3, 'common', 'Чинит всё, до чего дотянутся клешни.'),
  unit('torpedo', 'Торпеда', 'submarine', 3, 4, 1, 'rare', 'Рывок: атакует сразу.', ['charge']),
  unit('diver', 'Водолаз', 'submarine', 3, 2, 5, 'rare', 'Защитник в тяжёлом скафандре.', ['guard']),
  unit('kraken', 'Кракен', 'submarine', 6, 6, 7, 'epic', 'Древний ужас глубин.'),
  // Замок
  unit('squire', 'Оруженосец', 'castle', 1, 2, 1, 'common', 'Рвётся в бой раньше рыцаря.'),
  unit('archer', 'Лучница', 'castle', 2, 3, 2, 'common', 'Стреляет без промаха.'),
  unit('knight', 'Рыцарь', 'castle', 4, 4, 4, 'rare', 'Защитник замковых ворот.', ['guard']),
  unit('gargoyle', 'Горгулья', 'castle', 5, 5, 6, 'epic', 'Каменный защитник.', ['guard']),
  unit('shadow', 'Тень Хранителя', 'castle', 7, 7, 7, 'legendary', 'Рывок: атакует сразу.', ['charge']),
];

export const cards: Record<string, CardDef> = Object.fromEntries(list.map((card) => [card.id, card]));
