import type { CardKeyword } from '@core/content/types';

export const KEYWORD_LABELS: Record<CardKeyword, string> = {
  guard: 'Защитник',
  charge: 'Рывок',
  poison: 'Яд',
  shield: 'Щит',
};

export const KEYWORD_DESCRIPTIONS: Record<CardKeyword, string> = {
  guard: 'враг обязан атаковать это существо первым, пока оно на столе',
  charge: 'может атаковать в тот же ход, когда вышло на стол',
  poison: 'убивает любое существо, которому нанесло урон, сколько бы здоровья у того ни было',
  shield: 'гасит первый удар, который получит существо, затем щит исчезает',
};
