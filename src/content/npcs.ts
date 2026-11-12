import type { NpcDef } from '@core/content/types';

export const npcs: Record<string, NpcDef> = {
  elder: {
    id: 'elder',
    name: 'Старейшина Велимир',
    look: { body: 0x7a4fb5, skin: 0xf0c9a0, hat: 0xe8e8e8 },
    scripts: [
      {
        when: [{ type: 'questStatus', questId: 'first_steps', status: 'inactive' }],
        lines: [
          'Странник! Наконец-то ты проснулся.',
          'Хранитель Колоды забрал карты миров и заперся в своём замке.',
          'Вернуть их можно только одним способом — обыграть его в карты.',
          'Но сначала собери колоду посильнее. Начни с малого: помоги фермеру Мирону у загона на юго-востоке.',
        ],
        effects: [{ type: 'startQuest', questId: 'first_steps' }],
      },
      {
        when: [{ type: 'questStatus', questId: 'first_steps', status: 'active' }],
        lines: ['Мирон ждёт тебя у загона на юго-востоке. Не заставляй урожай гнить.'],
      },
      {
        lines: [
          'Ты хорошо справился. Люк на востоке теперь открыт.',
          'Он ведёт на подлодку «Наутилус-8» — спроси капитана, чем помочь.',
        ],
      },
    ],
  },
  farmer: {
    id: 'farmer',
    name: 'Фермер Мирон',
    look: { body: 0x3f7fbf, skin: 0xe0ac7e, hat: 0xd9b34a },
    scripts: [
      {
        when: [{ type: 'questStatus', questId: 'first_steps', status: 'inactive' }],
        lines: ['Не видишь — занят я. Поговори сперва со старейшиной.'],
      },
      {
        when: [{ type: 'questStatus', questId: 'first_steps', status: 'active' }],
        lines: [
          'А, помощник! Яблоки сыплются быстрее, чем я успеваю их ловить.',
          'Держи корзину. Лови яблоки, но не трогай гнилые!',
        ],
        effects: [{ type: 'startMinigame', minigameId: 'harvest' }],
      },
      {
        lines: ['Хочешь ещё половить яблоки? Корзина твоя!'],
        effects: [{ type: 'startMinigame', minigameId: 'harvest' }],
      },
    ],
  },
  captain: {
    id: 'captain',
    name: 'Капитан Ния',
    look: { body: 0x1f3a5f, skin: 0xc98f6b, hat: 0xf2f2f2 },
    scripts: [
      {
        when: [{ type: 'questStatus', questId: 'deep_cargo', status: 'inactive' }],
        lines: [
          'Добро пожаловать на борт, Странник.',
          'В кормовом отсеке лежит ящик с редкими картами глубин, но механик его никому не отдаёт.',
          'Договорись с ним — и я открою шлюз к замку.',
        ],
        effects: [{ type: 'startQuest', questId: 'deep_cargo' }],
      },
      {
        when: [{ type: 'questStatus', questId: 'deep_cargo', status: 'active' }],
        lines: ['Механик в кормовом отсеке — иди на восток через оба переборочных прохода.'],
      },
      {
        when: [{ type: 'questStatus', questId: 'final_game', status: 'inactive' }],
        lines: [
          'Груз у тебя? Отлично. Шлюз на востоке открыт.',
          'За ним — замок Хранителя. Сыграй с ним последнюю партию.',
        ],
        effects: [{ type: 'startQuest', questId: 'final_game' }],
      },
      { lines: ['Семь футов под килем, Странник.'] },
    ],
  },
  engineer: {
    id: 'engineer',
    name: 'Механик Гром',
    look: { body: 0xb5651d, skin: 0xe0ac7e, hat: 0x555555 },
    scripts: [
      {
        when: [{ type: 'questStatus', questId: 'deep_cargo', status: 'active' }],
        lines: [
          'Капитан прислала? Так бы сразу и сказал.',
          'Только карты в ящике перемешались. Помоги разобрать их по парам — и забирай.',
        ],
        effects: [{ type: 'startMinigame', minigameId: 'cargo_sort' }],
      },
      {
        when: [{ type: 'questStatus', questId: 'deep_cargo', status: 'completed' }],
        lines: ['Турбины гудят ровно. Хочешь ещё раз разобрать ящик?'],
        effects: [{ type: 'startMinigame', minigameId: 'cargo_sort' }],
      },
      { lines: ['Турбины гудят ровно. Значит, день хороший.'] },
    ],
  },
  void_captain: {
    id: 'void_captain',
    name: 'Капитан Пустоты',
    look: { body: 0x2a3f6b, skin: 0x9fe3d6, hat: 0x6bd6e3 },
    scripts: [
      {
        when: [{ type: 'bossDefeated', bossId: 'void_captain', value: true }],
        lines: ['Курс свободен, Странник. Дальше — только звёзды.'],
      },
      {
        lines: [
          'Гость с поверхности? Давно никто не поднимался так высоко.',
          'Карты Хранителя теперь мои. Хочешь их — выиграй.',
        ],
        effects: [{ type: 'startBattle', bossId: 'void_captain' }],
      },
    ],
  },
  keeper: {
    id: 'keeper',
    name: 'Хранитель Колоды',
    look: { body: 0x2b1d3a, skin: 0xb8b0c8, hat: 0xd9a441 },
    scripts: [
      {
        when: [
          { type: 'bossDefeated', bossId: 'keeper', value: true },
          { type: 'questStatus', questId: 'beyond', status: 'inactive' },
        ],
        lines: [
          'Ты победил честно. Карты миров снова свободны… пока что.',
          'Но часть колоды я проиграл раньше — Капитану Пустоты, на орбите.',
          'Звёздные врата в углу зала открыты. Верни карты, Странник.',
        ],
        effects: [{ type: 'startQuest', questId: 'beyond' }],
      },
      {
        when: [{ type: 'bossDefeated', bossId: 'keeper', value: true }],
        lines: ['Звёздные врата — в северо-восточном углу зала.'],
      },
      {
        lines: [
          'Ещё один Странник, решивший, что его колода чего-то стоит.',
          'Садись. Проигравший оставляет карты на столе.',
        ],
        effects: [{ type: 'startBattle', bossId: 'keeper' }],
      },
    ],
  },
};
