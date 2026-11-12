import type { QuestDef } from '@core/content/types';

export const quests: Record<string, QuestDef> = {
  first_steps: {
    id: 'first_steps',
    title: 'Первые шаги',
    description: 'Помоги фермеру Мирону и получи первые карты.',
    objectives: [
      { id: 'talk_farmer', text: 'Поговори с фермером Мироном', type: 'talkTo', npcId: 'farmer' },
      { id: 'win_harvest', text: 'Собери урожай в мини-игре', type: 'winMinigame', minigameId: 'harvest' },
    ],
    rewardCards: ['bull', 'crab'],
  },
  deep_cargo: {
    id: 'deep_cargo',
    title: 'Глубинный груз',
    description: 'Забери у механика ящик с картами глубин.',
    objectives: [
      { id: 'talk_engineer', text: 'Найди механика в кормовом отсеке', type: 'talkTo', npcId: 'engineer' },
      { id: 'win_cargo', text: 'Помоги с описью груза', type: 'winMinigame', minigameId: 'cargo_sort' },
    ],
    rewardCards: ['torpedo', 'diver', 'kraken'],
  },
  final_game: {
    id: 'final_game',
    title: 'Последняя партия',
    description: 'Обыграй Хранителя Колоды в его замке.',
    objectives: [
      { id: 'enter_castle', text: 'Войди в замок Хранителя', type: 'enterLevel', levelId: 'castle' },
      { id: 'defeat_keeper', text: 'Победи Хранителя в карточном бою', type: 'defeatBoss', bossId: 'keeper' },
    ],
    rewardCards: ['shadow'],
  },
  beyond: {
    id: 'beyond',
    title: 'За горизонтом',
    description: 'Поднимись на орбитальную станцию и верни карты, проигранные Хранителем.',
    objectives: [
      { id: 'enter_station', text: 'Пройди через звёздные врата в замке', type: 'enterLevel', levelId: 'station' },
      { id: 'defeat_captain', text: 'Победи Капитана Пустоты', type: 'defeatBoss', bossId: 'void_captain' },
    ],
    rewardCards: ['titan'],
  },
};
