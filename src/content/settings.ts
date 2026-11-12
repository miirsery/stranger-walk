import type { SettingDef } from '@core/content/types';

/**
 * Сеттинги — наборы тайлов и атмосфера. Чтобы добавить новый мир, достаточно
 * описать его здесь и сослаться на него из уровня: движок править не нужно.
 */
export const settings: Record<string, SettingDef> = {
  fields: {
    id: 'fields',
    name: 'Поля',
    description: 'Тихие луга, с которых начинается путь Странника.',
    backgroundColor: 0x2f6b3a,
    music: 'fields',
    tiles: {
      '.': { name: 'Трава', solid: false, color: 0x4c9a4a, accent: 0x3f8640, pattern: 'speckle' },
      ',': { name: 'Цветы', solid: false, color: 0x4c9a4a, accent: 0xf2d94e, pattern: 'speckle' },
      '=': { name: 'Тропа', solid: false, color: 0xc9a66b, accent: 0xb08d55, pattern: 'speckle' },
      '#': { name: 'Дерево', solid: true, color: 0x1f5a32, accent: 0x2f7a3f, pattern: 'bricks' },
      '~': { name: 'Вода', solid: true, color: 0x3b7dd8, accent: 0x7fb2f0, pattern: 'waves' },
      F: { name: 'Забор', solid: true, color: 0x8a5a2b, accent: 0x5e3c1a, pattern: 'planks' },
      D: { name: 'Люк', solid: false, color: 0x565b6e, accent: 0xf2d94e, pattern: 'door' },
    },
  },
  submarine: {
    id: 'submarine',
    name: 'Подводная лодка',
    description: 'Тесные отсеки, гул турбин и свет иллюминаторов.',
    backgroundColor: 0x0b1e33,
    music: 'submarine',
    tiles: {
      '.': { name: 'Палуба', solid: false, color: 0x5a6b7a, accent: 0x4a5a68, pattern: 'grid' },
      '#': { name: 'Корпус', solid: true, color: 0x2c3a47, accent: 0x1d2831, pattern: 'bricks' },
      o: { name: 'Иллюминатор', solid: true, color: 0x2c3a47, accent: 0x4fc3f7, pattern: 'door' },
      '=': { name: 'Трубы', solid: true, color: 0xb5651d, accent: 0x7a4313, pattern: 'planks' },
      D: { name: 'Шлюз', solid: false, color: 0x3d4c5a, accent: 0x7be36b, pattern: 'door' },
    },
  },
  castle: {
    id: 'castle',
    name: 'Замок',
    description: 'Каменные залы, где ждёт Хранитель Колоды.',
    backgroundColor: 0x17131f,
    music: 'castle',
    tiles: {
      '.': { name: 'Каменный пол', solid: false, color: 0x6b6477, accent: 0x5a5466, pattern: 'grid' },
      '=': { name: 'Ковёр', solid: false, color: 0x9c2b3a, accent: 0xd9a441, pattern: 'planks' },
      '#': { name: 'Стена', solid: true, color: 0x3a3447, accent: 0x262231, pattern: 'bricks' },
      T: { name: 'Факел', solid: true, color: 0x3a3447, accent: 0xf2a33a, pattern: 'door' },
      D: { name: 'Ворота', solid: false, color: 0x4a3524, accent: 0xd9a441, pattern: 'door' },
    },
  },
  // Сеттинг готов к использованию: уровни в космосе появятся на следующих этапах.
  space: {
    id: 'space',
    name: 'Космос',
    description: 'Орбитальная станция на краю известных миров.',
    backgroundColor: 0x05060f,
    music: 'space',
    tiles: {
      '.': { name: 'Панель', solid: false, color: 0x8892a6, accent: 0x6d778c, pattern: 'grid' },
      '#': { name: 'Переборка', solid: true, color: 0x3b4254, accent: 0x272c3a, pattern: 'bricks' },
      '*': { name: 'Пустота', solid: true, color: 0x05060f, accent: 0xffffff, pattern: 'stars' },
      D: { name: 'Шлюз', solid: false, color: 0x3b4254, accent: 0x6bd6e3, pattern: 'door' },
    },
  },
};
