import type { StarterDeckDef } from '@core/content/types';

/**
 * Три варианта стартовой колоды — из карт лугов, доступных ещё до первого боя.
 * Выбирается на экране перед новой игрой; `scout` совпадает с `player.starterDeck`.
 */
export const starterDecks: StarterDeckDef[] = [
  {
    id: 'scout',
    name: 'Разведчик',
    description: 'Ровная колода без перекоса — годится для первого знакомства с боем.',
    cards: ['sprout', 'sprout', 'scarecrow', 'scarecrow', 'fox', 'fox', 'reaper', 'reaper'],
  },
  {
    id: 'swarm',
    name: 'Рой',
    description: 'Агро: дешёвые существа с рывком выходят в бой сразу, яд добивает раненых.',
    cards: ['hive', 'hive', 'fox', 'fox', 'sprout', 'sprout', 'viper', 'viper'],
  },
  {
    id: 'bastion',
    name: 'Бастион',
    description: 'Контроль: крепкие защитники держат стол, пока герой лечится и наращивает перевес.',
    cards: ['scarecrow', 'scarecrow', 'reaper', 'reaper', 'bull', 'bull', 'feast', 'feast'],
  },
];
