import type { ObjectiveDef, QuestDef, QuestStatus } from '../content/types';
import type { QuestSave } from '../session/save';

/** Игровые события, которые двигают цели квестов. */
export type ProgressEvent =
  | { type: 'npcTalked'; npcId: string }
  | { type: 'minigameWon'; minigameId: string }
  | { type: 'levelEntered'; levelId: string }
  | { type: 'bossDefeated'; bossId: string };

export interface ObjectiveView {
  def: ObjectiveDef;
  done: boolean;
}

export interface QuestView {
  def: QuestDef;
  status: QuestStatus;
  objectives: ObjectiveView[];
}

export interface QuestProgress {
  /** Квесты, в которых закрылась хотя бы одна цель. */
  updated: QuestDef[];
  /** Квесты, завершённые этим событием. */
  completed: QuestDef[];
}

const matches = (objective: ObjectiveDef, event: ProgressEvent): boolean => {
  switch (objective.type) {
    case 'talkTo':
      return event.type === 'npcTalked' && event.npcId === objective.npcId;
    case 'winMinigame':
      return event.type === 'minigameWon' && event.minigameId === objective.minigameId;
    case 'enterLevel':
      return event.type === 'levelEntered' && event.levelId === objective.levelId;
    case 'defeatBoss':
      return event.type === 'bossDefeated' && event.bossId === objective.bossId;
  }
};

interface QuestEntry {
  def: QuestDef;
  status: QuestStatus;
  done: Set<string>;
}

/** Журнал квестов: статусы и прогресс целей. Награды выдаёт вызывающий код (GameSession). */
export class QuestLog {
  private readonly entries = new Map<string, QuestEntry>();

  constructor(private readonly resolve: (questId: string) => QuestDef) {}

  status(questId: string): QuestStatus {
    return this.entries.get(questId)?.status ?? 'inactive';
  }

  /** Возвращает false, если квест уже взят или завершён. */
  start(questId: string): boolean {
    if (this.entries.has(questId)) return false;
    this.entries.set(questId, { def: this.resolve(questId), status: 'active', done: new Set() });
    return true;
  }

  handle(event: ProgressEvent): QuestProgress {
    const progress: QuestProgress = { updated: [], completed: [] };
    for (const entry of this.entries.values()) {
      if (entry.status !== 'active') continue;
      let changed = false;
      for (const objective of entry.def.objectives) {
        if (!entry.done.has(objective.id) && matches(objective, event)) {
          entry.done.add(objective.id);
          changed = true;
        }
      }
      if (!changed) continue;
      progress.updated.push(entry.def);
      if (entry.def.objectives.every((objective) => entry.done.has(objective.id))) {
        entry.status = 'completed';
        progress.completed.push(entry.def);
      }
    }
    return progress;
  }

  /** Отладка: завершает все активные квесты и возвращает их (награды выдаёт вызывающий код). */
  completeActive(): QuestDef[] {
    const completed: QuestDef[] = [];
    for (const entry of this.entries.values()) {
      if (entry.status !== 'active') continue;
      for (const objective of entry.def.objectives) entry.done.add(objective.id);
      entry.status = 'completed';
      completed.push(entry.def);
    }
    return completed;
  }

  /** Снимок для сохранения. */
  snapshot(): QuestSave[] {
    return [...this.entries.values()].map((entry) => ({
      id: entry.def.id,
      status: entry.status === 'completed' ? 'completed' : 'active',
      done: [...entry.done],
    }));
  }

  /** Восстанавливает журнал из сохранения. Неизвестные цели отбрасываются. */
  restore(saves: readonly QuestSave[]): void {
    this.entries.clear();
    for (const save of saves) {
      const def = this.resolve(save.id);
      const known = new Set(def.objectives.map((objective) => objective.id));
      this.entries.set(def.id, {
        def,
        status: save.status,
        done: new Set(save.done.filter((id) => known.has(id))),
      });
    }
  }

  /** Взятые квесты в порядке получения. */
  list(): QuestView[] {
    return [...this.entries.values()].map((entry) => ({
      def: entry.def,
      status: entry.status,
      objectives: entry.def.objectives.map((def) => ({ def, done: entry.done.has(def.id) })),
    }));
  }
}
