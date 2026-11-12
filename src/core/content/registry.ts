import type {
  BossDef,
  CardDef,
  GameContent,
  LevelDef,
  MinigameDef,
  MusicTrackDef,
  NpcDef,
  QuestDef,
  SettingDef,
} from './types';

const lookup = <T>(table: Record<string, T>, kind: string, id: string): T => {
  const value = table[id];
  if (value === undefined) throw new Error(`Контент: ${kind} «${id}» не найден`);
  return value;
};

/** Типобезопасный доступ к контенту: отсутствие записи — ошибка, а не undefined. */
export class ContentRegistry {
  constructor(readonly data: GameContent) {}

  setting = (id: string): SettingDef => lookup(this.data.settings, 'сеттинг', id);
  level = (id: string): LevelDef => lookup(this.data.levels, 'уровень', id);
  npc = (id: string): NpcDef => lookup(this.data.npcs, 'NPC', id);
  quest = (id: string): QuestDef => lookup(this.data.quests, 'квест', id);
  card = (id: string): CardDef => lookup(this.data.cards, 'карта', id);
  boss = (id: string): BossDef => lookup(this.data.bosses, 'босс', id);
  minigame = (id: string): MinigameDef => lookup(this.data.minigames, 'мини-игра', id);
  track = (id: string): MusicTrackDef => lookup(this.data.music, 'трек', id);
}
