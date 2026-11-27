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
        when: [
          { type: 'questStatus', questId: 'first_steps', status: 'completed' },
          { type: 'questStatus', questId: 'forest_path', status: 'inactive' },
        ],
        lines: [
          'Ты хорошо справился. Люк на востоке теперь открыт.',
          'Он ведёт на подлодку «Наутилус-8» — спроси капитана, чем помочь.',
          'И ещё: в кустах у западной стены что-то шуршит. Если любопытно — сходи глянь.',
        ],
        effects: [{ type: 'startQuest', questId: 'forest_path' }],
      },
      {
        lines: [
          'Люк на востоке ведёт на подлодку «Наутилус-8».',
          'А шорох в кустах на западе, если ты его уже нашёл, подождёт.',
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
  beekeeper: {
    id: 'beekeeper',
    name: 'Пасечник Тихон',
    look: { body: 0xd9b34a, skin: 0xe0ac7e, hat: 0xf2f2f2 },
    scripts: [
      {
        when: [{ type: 'questStatus', questId: 'first_steps', status: 'inactive' }],
        lines: ['Рой совсем одичал у пруда — но сперва помоги старейшине, потом поговорим.'],
      },
      {
        when: [{ type: 'questStatus', questId: 'first_steps', status: 'active' }],
        lines: ['Мирон всё ещё ждёт помощи с урожаем? Рой подождёт, старейшина — нет.'],
      },
      {
        when: [
          { type: 'questStatus', questId: 'first_steps', status: 'completed' },
          { type: 'questStatus', questId: 'wild_swarm', status: 'inactive' },
        ],
        lines: [
          'Странник! Рой у пруда взбесился — того гляди, разнесёт ульи.',
          'Пчёлы боятся шума сбора урожая. Собери его ещё раз у Мирона — прогонишь рой заодно.',
        ],
        effects: [{ type: 'startQuest', questId: 'wild_swarm' }],
      },
      {
        when: [{ type: 'questStatus', questId: 'wild_swarm', status: 'active' }],
        lines: ['Корзина у Мирона. Собери урожай ещё раз — рой угомонится.'],
      },
      { lines: ['Рой угомонился. Заходи — мёд для тебя всегда найдётся.'] },
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
      {
        when: [{ type: 'questStatus', questId: 'ballast_echo', status: 'inactive' }],
        lines: [
          'Постой. Пока ты был у механика, я слышала стук из балластного отсека внизу.',
          'Мы туда давно не заглядывали — если не страшно, глянь, что там.',
        ],
        effects: [{ type: 'startQuest', questId: 'ballast_echo' }],
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
        when: [
          { type: 'bossDefeated', bossId: 'void_captain', value: true },
          { type: 'questStatus', questId: 'lost_pilot', status: 'inactive' },
        ],
        lines: [
          'Курс свободен, Странник. Дальше — только звёзды.',
          'Постой — в отсеке спасательных капсул, кажется, до сих пор кто-то прячется от меня. Проверь, если не веришь мне на слово.',
        ],
        effects: [{ type: 'startQuest', questId: 'lost_pilot' }],
      },
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
  wandering_bard: {
    id: 'wandering_bard',
    name: 'Бродячий музыкант Лют',
    look: { body: 0x8a5a2b, skin: 0xe0ac7e, hat: 0x7a4fb5 },
    scripts: [
      {
        lines: ['Присядь на пригорок — сыграем вместе. Успевай за ритмом, и будет тебе награда.'],
        effects: [{ type: 'startMinigame', minigameId: 'meadow_rhythm' }],
      },
    ],
  },
  trapped_fox: {
    id: 'trapped_fox',
    name: 'Лисица в капкане',
    look: { body: 0xb5572a, skin: 0xe0ac7e, hat: 0x6b3f1f },
    scripts: [
      {
        when: [{ type: 'flag', flagId: 'fox_spared', value: true }],
        lines: ['Капкан давно пуст — лисица убежала в чащу, едва ты щёлкнул защёлкой.'],
      },
      {
        when: [{ type: 'flag', flagId: 'fox_taken', value: true }],
        lines: ['От капкана остались одни щепки — шкуру ты забрал ещё тогда.'],
      },
      {
        lines: [
          'Тонкий писк из капкана у старого пня — лапа лисицы зажата в железе.',
          'Отпустить её — или забрать шкуру, пока цела?',
        ],
        effects: [{ type: 'startQuest', questId: 'trapped_fox' }],
        choices: [
          {
            text: 'Отпустить лисицу',
            lines: ['Капкан щёлкает, лисица уносится в кусты — но не сразу: у твоих ног остаётся горсть ягод.'],
            effects: [
              { type: 'setFlag', flagId: 'fox_spared' },
              { type: 'grantCards', cardIds: ['feast'] },
              { type: 'changeReputation', amount: 2 },
            ],
          },
          {
            text: 'Забрать шкуру',
            lines: ['Шкура ещё тёплая. Из неё выйдет неплохое чучело для поля.'],
            effects: [
              { type: 'setFlag', flagId: 'fox_taken' },
              { type: 'grantCards', cardIds: ['scarecrow'] },
              { type: 'changeReputation', amount: -2 },
            ],
          },
        ],
      },
    ],
  },
  beggar: {
    id: 'beggar',
    name: 'Бродяга Кузьма',
    look: { body: 0x5a5248, skin: 0xc98f6b, hat: 0x3a342c },
    scripts: [
      { when: [{ type: 'flag', flagId: 'beggar_helped', value: true }], lines: ['Твоя доброта меня до сих пор греет. Храни тебя луга.'] },
      { when: [{ type: 'flag', flagId: 'beggar_shooed', value: true }], lines: ['Опять ты. Иди своей дорогой.'] },
      {
        lines: ['Странник, подай медяк на хлеб — третий день маковой росинки во рту не было.'],
        choices: [
          {
            text: 'Поделиться едой',
            lines: ['Бродяга кланяется чуть не до земли — не ожидал такой щедрости.'],
            effects: [{ type: 'setFlag', flagId: 'beggar_helped' }, { type: 'changeReputation', amount: 2 }],
          },
          {
            text: 'Прогнать',
            lines: ['Бродяга съёживается и уходит, бормоча что-то под нос.'],
            effects: [{ type: 'setFlag', flagId: 'beggar_shooed' }, { type: 'changeReputation', amount: -2 }],
          },
        ],
      },
    ],
  },
  fisher_mate: {
    id: 'fisher_mate',
    name: 'Матрос Тимофей',
    look: { body: 0x3f7fbf, skin: 0xe0ac7e, hat: 0x555555 },
    scripts: [
      {
        lines: ['В свободную вахту — только с удочкой к иллюминатору. Клёв сегодня неплохой, попробуешь?'],
        effects: [{ type: 'startMinigame', minigameId: 'submarine_fishing' }],
      },
    ],
  },
  trader: {
    id: 'trader',
    name: 'Торговка Лина',
    look: { body: 0x8a5a2b, skin: 0xe0ac7e, hat: 0xd94e4e },
    scripts: [
      {
        // Репутация копится из мелких поступков по всей игре (выбор в диалогах) — здесь
        // она меняет не реплику ради реплики, а то, что торговка продаёт и почём.
        when: [{ type: 'reputation', atLeast: 3 }],
        lines: ['О тебе тут добрые слухи ходят. Для такого — цены свои, особые.', 'Смотри, что есть.'],
        effects: [
          {
            type: 'openTrade',
            offers: [
              { cardId: 'bull', price: 16 },
              { cardId: 'ghost', price: 9 },
              { cardId: 'knight', price: 20 },
            ],
            artifactOffers: [
              { artifactId: 'amulet_vitality', price: 24 },
              { artifactId: 'mage_glove', price: 20 },
              { artifactId: 'fury_belt', price: 24 },
            ],
          },
        ],
      },
      {
        when: [{ type: 'reputation', atMost: -3 }],
        lines: ['Слухи о тебе так себе — но монета есть монета. Накинула цену, не обижайся.'],
        effects: [
          {
            type: 'openTrade',
            offers: [
              { cardId: 'bull', price: 26 },
              { cardId: 'ghost', price: 16 },
              { cardId: 'knight', price: 32 },
            ],
            artifactOffers: [
              { artifactId: 'amulet_vitality', price: 38 },
              { artifactId: 'mage_glove', price: 32 },
              { artifactId: 'fury_belt', price: 38 },
            ],
          },
        ],
      },
      {
        lines: ['Монеты из мини-игр без дела не лежат — у меня на них меняют карты.', 'Смотри, что есть.'],
        effects: [
          {
            type: 'openTrade',
            offers: [
              { cardId: 'bull', price: 20 },
              { cardId: 'ghost', price: 12 },
              { cardId: 'knight', price: 25 },
            ],
            artifactOffers: [
              { artifactId: 'amulet_vitality', price: 30 },
              { artifactId: 'mage_glove', price: 25 },
              { artifactId: 'fury_belt', price: 30 },
            ],
          },
        ],
      },
    ],
  },
  old_diver: {
    id: 'old_diver',
    name: 'Старый водолаз Феликс',
    look: { body: 0x4a3f2b, skin: 0xc98f6b, hat: 0x2c3a47 },
    scripts: [
      {
        when: [{ type: 'questStatus', questId: 'ballast_echo', status: 'inactive' }],
        lines: ['Стук? А, это трубы — старые, вот и бьются о переборку. Не беспокойся.'],
      },
      {
        when: [{ type: 'questStatus', questId: 'ballast_echo', status: 'active' }],
        lines: [
          'Капитан прислала? Значит, не одному мне было интересно.',
          'Я тут живу с тех пор, как списался на берег — отсек тихий, медузы в балласте светятся по ночам.',
          'Возьми одну — в бою жалит похлеще настоящей.',
        ],
      },
      { lines: ['Трубы стучат, медузы светятся — всё как обычно.'] },
    ],
  },
  hermit: {
    id: 'hermit',
    name: 'Лесник Яромир',
    look: { body: 0x4a6b3a, skin: 0xe0ac7e, hat: 0x5c4a2e },
    scripts: [
      {
        when: [{ type: 'questStatus', questId: 'forest_path', status: 'inactive' }],
        lines: ['Чужого здесь не ждали.', 'Если тебя не посылал старейшина — проходи мимо, путник.'],
      },
      {
        when: [{ type: 'questStatus', questId: 'forest_path', status: 'active' }],
        lines: [
          'А, это ты — старейшина предупреждал.',
          'У поваленного дерева развёлся выводок гадюк, пока меня не было. Возьми одну — в бою пригодится.',
          'Только осторожно: яд у неё не только для врагов.',
        ],
      },
      { lines: ['Тропа заросла — значит, точно не ко мне.'] },
    ],
  },
  jester_ghost: {
    id: 'jester_ghost',
    name: 'Призрак шута Гвидо',
    look: { body: 0xd8d8f0, skin: 0xb8b0c8, hat: 0xd94e4e },
    scripts: [
      {
        when: [{ type: 'questStatus', questId: 'forgotten_jester', status: 'inactive' }],
        lines: ['Тут всегда было тихо — даже когда я ещё смеялся.', 'Если Хранитель не посылал тебя — ступай обратно наверх.'],
      },
      {
        when: [{ type: 'questStatus', questId: 'forgotten_jester', status: 'active' }],
        lines: [
          'Хранитель вспомнил про меня? Надо же.',
          'Прежний Хранитель запер меня здесь за шутку, которая ему не понравилась. Новый просто забыл открыть дверь.',
          'Возьми меня с собой — в карточном виде я хотя бы могу отсюда уйти.',
        ],
      },
      { lines: ['Здесь тихо. Шутки кончились — как и я, в некотором смысле.'] },
    ],
  },
  casemate_warden: {
    id: 'casemate_warden',
    name: 'Страж каземата',
    look: { body: 0x4a4458, skin: 0x8f8898, hat: 0x2b2633 },
    scripts: [
      { when: [{ type: 'bossDefeated', bossId: 'casemate_warden', value: true }], lines: ['Камера пуста. Иди.'] },
      {
        lines: ['Квест тебя сюда не посылал. Но колода при мне — и я не отдам её просто так.'],
        effects: [{ type: 'startBattle', bossId: 'casemate_warden' }],
      },
    ],
  },
  crystal_golem: {
    id: 'crystal_golem',
    name: 'Кристальный голем',
    look: { body: 0x9b6bd6, skin: 0x3a2f4a, hat: 0x241d33 },
    scripts: [
      { when: [{ type: 'bossDefeated', bossId: 'crystal_golem', value: true }], lines: ['Тихо здесь. Было тихо и будет.'] },
      {
        lines: ['Чужак в моих пещерах. Кристаллы не любят чужаков.'],
        effects: [{ type: 'startBattle', bossId: 'crystal_golem' }],
      },
    ],
  },
  prospector: {
    id: 'prospector',
    name: 'Старатель Фёдор',
    look: { body: 0x6b5a3f, skin: 0xc98f6b, hat: 0x8a5a2b },
    scripts: [
      {
        lines: ['Кристаллы здесь звенят, если знать, как слушать. Попробуешь на память?'],
        effects: [{ type: 'startMinigame', minigameId: 'cave_memory' }],
      },
    ],
  },
  puzzle_keeper: {
    id: 'puzzle_keeper',
    name: 'Отшельница Зоя',
    look: { body: 0x7a5a8a, skin: 0xe0ac7e, hat: 0x3a2f4a },
    scripts: [
      {
        lines: ['Старая головоломка в сумке совсем разболталась — числа разбежались по клеткам. Собери их по порядку?'],
        effects: [{ type: 'startMinigame', minigameId: 'forest_puzzle' }],
      },
    ],
  },
  stranded_pilot: {
    id: 'stranded_pilot',
    name: 'Пилот Эрик',
    look: { body: 0x55607a, skin: 0xc98f6b, hat: 0x6bd6e3 },
    scripts: [
      {
        when: [{ type: 'questStatus', questId: 'lost_pilot', status: 'inactive' }],
        lines: ['Эта капсула списана. Если ты не из экипажа — проходи мимо.'],
      },
      {
        when: [{ type: 'questStatus', questId: 'lost_pilot', status: 'active' }],
        lines: [
          'Капитан Пустоты наконец проиграла? Не верится.',
          'Я прятался здесь с тех пор, как станция перешла к ней — не всем нравится служить тому, кто играет на жизни экипажа.',
          'Возьми вот это — капсула засекла комету ещё до того, как я спрятался. Может, пригодится в бою.',
        ],
      },
      { lines: ['Станция свободна — но я, пожалуй, останусь здесь ещё немного.'] },
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
        when: [
          { type: 'bossDefeated', bossId: 'keeper', value: true },
          { type: 'questStatus', questId: 'forgotten_jester', status: 'inactive' },
        ],
        lines: [
          'Погоди.',
          'За западной дверью зала — старый каземат. Я давно забыл, кого там держат.',
          'Если услышишь смех — не пугайся, это не угроза.',
        ],
        effects: [{ type: 'startQuest', questId: 'forgotten_jester' }],
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
