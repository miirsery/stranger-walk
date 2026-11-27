import type { ArtifactDef } from '@core/content/types';

/**
 * Экипировка вне боя — не карты, не занимают место в колоде. Экипирован максимум один
 * артефакт за раз (см. `GameSession.equipArtifact`); продаются у торговца на Тихих лугах.
 */
export const artifacts: Record<string, ArtifactDef> = {
  amulet_vitality: {
    id: 'amulet_vitality',
    name: 'Амулет стойкости',
    description: '+4 к здоровью героя в бою.',
    effect: { type: 'heroHealth', amount: 4 },
  },
  mage_glove: {
    id: 'mage_glove',
    name: 'Перчатка мага',
    description: 'Сила героя стоит на 1 ману дешевле.',
    effect: { type: 'powerCostDelta', amount: 1 },
  },
  fury_belt: {
    id: 'fury_belt',
    name: 'Пояс ярости',
    description: 'Каждая атака копит на 1 больше ярости.',
    effect: { type: 'rageGainBonus', amount: 1 },
  },
};
