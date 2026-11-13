import type { GameContent } from '@core/content/types';
import { bosses } from './bosses';
import { cards } from './cards';
import { levels } from './levels';
import { minigames } from './minigames';
import { music } from './music';
import { npcs } from './npcs';
import { quests } from './quests';
import { settings } from './settings';
import { hints, story } from './story';

/** Весь контент игры одним объектом. Новый контент подключается здесь. */
export const gameContent: GameContent = {
  player: {
    look: { body: 0xd94f4f, skin: 0xf0c9a0, hat: 0x6b3f1d },
    speed: 72,
    heroHealth: 20,
    power: {
      name: 'Меткий бросок',
      text: '1 урон выбранной цели.',
      cost: 2,
      effect: { type: 'damageTarget', amount: 1 },
    },
    startLevel: 'meadow',
    starterDeck: ['sprout', 'sprout', 'scarecrow', 'scarecrow', 'fox', 'fox', 'reaper', 'reaper'],
  },
  deckRules: { minSize: 8, maxSize: 20, maxCopies: 2 },
  settings,
  levels,
  npcs,
  quests,
  cards,
  bosses,
  minigames,
  music,
  story,
  hints,
};
