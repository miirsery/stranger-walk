import type { Condition, Effect, GameContent, LevelDef, Point, SettingDef } from './types';

/**
 * Проверяет ссылочную целостность контента. Возвращает список проблем (пустой — всё в порядке).
 * Запускается в тестах, поэтому опечатка в id ловится до запуска игры.
 */
export const validateContent = (content: GameContent): string[] => {
  const errors: string[] = [];
  const has = (table: Record<string, unknown>, id: string): boolean => Object.hasOwn(table, id);
  const need = (table: Record<string, unknown>, kind: string, id: string, where: string): void => {
    if (!has(table, id)) errors.push(`${where}: неизвестный ${kind} «${id}»`);
  };
  const needCards = (ids: string[], where: string): void => {
    for (const id of ids) need(content.cards, 'карта', id, where);
  };

  const checkConditions = (conditions: Condition[] | undefined, where: string): void => {
    for (const condition of conditions ?? []) {
      if (condition.type === 'questStatus') need(content.quests, 'квест', condition.questId, where);
      else need(content.bosses, 'босс', condition.bossId, where);
    }
  };

  const checkEffects = (effects: Effect[] | undefined, where: string): void => {
    for (const effect of effects ?? []) {
      switch (effect.type) {
        case 'startQuest':
          need(content.quests, 'квест', effect.questId, where);
          break;
        case 'startMinigame':
          need(content.minigames, 'мини-игра', effect.minigameId, where);
          break;
        case 'startBattle':
          need(content.bosses, 'босс', effect.bossId, where);
          break;
        case 'grantCards':
          needCards(effect.cardIds, where);
          break;
      }
    }
  };

  const walkable = (level: LevelDef, setting: SettingDef | undefined, point: Point): boolean => {
    const char = level.rows[point.y]?.[point.x];
    if (char === undefined || setting === undefined) return false;
    return setting.tiles[char]?.solid === false;
  };

  for (const [id, record] of Object.entries({
    ...content.settings,
    ...content.levels,
    ...content.npcs,
    ...content.quests,
    ...content.cards,
    ...content.bosses,
    ...content.minigames,
    ...content.music,
  })) {
    if (record.id !== id) errors.push(`Запись «${id}»: ключ не совпадает с полем id «${record.id}»`);
  }

  for (const setting of Object.values(content.settings)) {
    need(content.music, 'трек', setting.music, `Сеттинг ${setting.id}`);
    for (const char of Object.keys(setting.tiles)) {
      if (char.length !== 1) errors.push(`Сеттинг ${setting.id}: ключ тайла «${char}» должен быть одним символом`);
    }
  }

  for (const level of Object.values(content.levels)) {
    const where = `Уровень ${level.id}`;
    need(content.settings, 'сеттинг', level.setting, where);
    const setting = content.settings[level.setting];
    const width = level.rows[0]?.length ?? 0;
    if (width === 0) errors.push(`${where}: пустая карта`);
    level.rows.forEach((row, y) => {
      if (row.length !== width) errors.push(`${where}: строка ${y} имеет длину ${row.length}, ожидалось ${width}`);
      for (const char of row) {
        if (setting && !has(setting.tiles, char)) errors.push(`${where}: строка ${y}, неизвестный тайл «${char}»`);
      }
    });
    if (!walkable(level, setting, level.spawn)) errors.push(`${where}: точка появления в стене или вне карты`);
    for (const placement of level.npcs) {
      need(content.npcs, 'NPC', placement.npcId, where);
      if (!walkable(level, setting, placement.at)) errors.push(`${where}: NPC ${placement.npcId} стоит в стене`);
    }
    for (const portal of level.portals) {
      if (!walkable(level, setting, portal.at)) errors.push(`${where}: портал (${portal.at.x},${portal.at.y}) недоступен`);
      need(content.levels, 'уровень', portal.toLevel, where);
      const target = content.levels[portal.toLevel];
      if (target) {
        if (!walkable(target, content.settings[target.setting], portal.toSpawn)) {
          errors.push(`${where}: портал в ${target.id} ведёт в стену`);
        }
        if (target.portals.some((p) => p.at.x === portal.toSpawn.x && p.at.y === portal.toSpawn.y)) {
          errors.push(`${where}: портал в ${target.id} ведёт прямо на другой портал`);
        }
      }
      checkConditions(portal.requires, where);
    }
  }

  for (const npc of Object.values(content.npcs)) {
    if (npc.scripts.length === 0) errors.push(`NPC ${npc.id}: нет сценариев`);
    for (const script of npc.scripts) {
      if (script.lines.length === 0) errors.push(`NPC ${npc.id}: сценарий без реплик`);
      checkConditions(script.when, `NPC ${npc.id}`);
      checkEffects(script.effects, `NPC ${npc.id}`);
    }
  }

  for (const quest of Object.values(content.quests)) {
    const where = `Квест ${quest.id}`;
    if (quest.objectives.length === 0) errors.push(`${where}: нет целей`);
    needCards(quest.rewardCards, where);
    for (const objective of quest.objectives) {
      switch (objective.type) {
        case 'talkTo':
          need(content.npcs, 'NPC', objective.npcId, where);
          break;
        case 'winMinigame':
          need(content.minigames, 'мини-игра', objective.minigameId, where);
          break;
        case 'enterLevel':
          need(content.levels, 'уровень', objective.levelId, where);
          break;
        case 'defeatBoss':
          need(content.bosses, 'босс', objective.bossId, where);
          break;
      }
    }
  }

  for (const card of Object.values(content.cards)) {
    need(content.settings, 'сеттинг', card.setting, `Карта ${card.id}`);
    if (card.cost < 0 || card.attack < 0 || card.health <= 0) errors.push(`Карта ${card.id}: некорректные характеристики`);
  }

  for (const boss of Object.values(content.bosses)) {
    need(content.settings, 'сеттинг', boss.setting, `Босс ${boss.id}`);
    need(content.music, 'трек', boss.music, `Босс ${boss.id}`);
    needCards(boss.deck, `Босс ${boss.id}`);
    needCards(boss.rewardCards, `Босс ${boss.id}`);
    if (boss.deck.length === 0) errors.push(`Босс ${boss.id}: пустая колода`);
  }

  for (const minigame of Object.values(content.minigames)) {
    need(content.music, 'трек', minigame.music, `Мини-игра ${minigame.id}`);
    needCards(minigame.rewardCards, `Мини-игра ${minigame.id}`);
  }

  need(content.levels, 'уровень', content.player.startLevel, 'Игрок');
  needCards(content.player.starterDeck, 'Игрок');
  const { minSize, maxSize } = content.deckRules;
  if (content.player.starterDeck.length < minSize || content.player.starterDeck.length > maxSize) {
    errors.push('Игрок: стартовая колода не укладывается в правила колоды');
  }

  return errors;
};
