import type { MinigameDef } from '@core/content/types';

export const minigames: Record<string, MinigameDef> = {
  harvest: {
    id: 'harvest',
    type: 'catch',
    name: 'Сбор урожая',
    instructions: 'Двигай корзину влево и вправо, лови яблоки. Гнилые не трогай!',
    durationMs: 40_000,
    targetScore: 10,
    spawnIntervalMs: 800,
    fallSpeed: 55,
    hazardChance: 0.25,
    maxMisses: 3,
    music: 'battle',
    rewardCards: ['archer', 'feast'],
  },
  cargo_sort: {
    id: 'cargo_sort',
    type: 'memory',
    name: 'Опись груза',
    instructions: 'Открывай по две плитки и находи одинаковые карты. Ошибок — не больше восьми.',
    cards: ['crab', 'torpedo', 'diver', 'kraken', 'depth_charge', 'fox'],
    maxMistakes: 8,
    revealMs: 900,
    music: 'battle',
    rewardCards: ['depth_charge', 'harpoon'],
  },
};
