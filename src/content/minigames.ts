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
    rewardCards: ['archer'],
  },
};
