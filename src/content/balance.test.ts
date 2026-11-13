import { describe, expect, it } from 'vitest';
import { simulateBattles } from '@core/battle/simulate';
import { CardCollection } from '@core/cards/collection';
import { ContentRegistry } from '@core/content/registry';
import { gameContent } from './index';

const registry = new ContentRegistry(gameContent);
const GAMES = 400;

/** Колода, которая получится у игрока, если он собрал все награды в сюжетном порядке. */
const deckAfter = (rewardSources: string[][]): string[] => {
  const collection = new CardCollection(gameContent.deckRules, gameContent.player.starterDeck);
  for (const cards of rewardSources) for (const cardId of cards) collection.add(cardId);
  return [...collection.deck];
};

const beforeKeeper = [
  registry.minigame('harvest').rewardCards,
  registry.quest('first_steps').rewardCards,
  registry.minigame('cargo_sort').rewardCards,
  registry.quest('deep_cargo').rewardCards,
];
const beforeCaptain = [...beforeKeeper, registry.boss('keeper').rewardCards, registry.quest('final_game').rewardCards];

const winRateAgainst = (bossId: string, deck: string[]): number => {
  const boss = registry.boss(bossId);
  const { player } = gameContent;
  return simulateBattles(
    registry.card,
    { name: 'Странник', health: player.heroHealth, deck, ...(player.power ? { power: player.power } : {}) },
    { name: boss.name, health: boss.health, deck: boss.deck, ...(boss.power ? { power: boss.power } : {}) },
    GAMES,
    7,
  ).winRate;
};

// Бои «ИИ против ИИ»: живой игрок играет лучше, так что это нижняя оценка его шансов.
// Коридоры задают замысел: первый босс проходим, второй заметно труднее, но не стена.
describe('баланс боссов', () => {
  it('Хранитель: колода из всех наград побеждает в 45–70% симуляций', () => {
    const rate = winRateAgainst('keeper', deckAfter(beforeKeeper));
    expect(rate).toBeGreaterThanOrEqual(0.45);
    expect(rate).toBeLessThanOrEqual(0.7);
  });

  it('Капитан Пустоты: труднее Хранителя — 30–55% побед', () => {
    const rate = winRateAgainst('void_captain', deckAfter(beforeCaptain));
    expect(rate).toBeGreaterThanOrEqual(0.3);
    expect(rate).toBeLessThanOrEqual(0.55);
  });

  it('стартовой колоды для Хранителя мало: квесты действительно нужны', () => {
    expect(winRateAgainst('keeper', [...gameContent.player.starterDeck])).toBeLessThan(0.3);
  });
});
