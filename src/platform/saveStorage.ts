import type { SaveData } from '@core/session/save';
import { parseSave } from '@core/session/save';

/** Слотов сохранения — у игрока может быть несколько независимых прохождений. */
export const SAVE_SLOT_COUNT = 3;

/**
 * Куда складывать сохранения. Сейчас — localStorage браузера; на других платформах
 * или при синхронизации с бэкендом достаточно другой реализации этого интерфейса.
 */
export interface SaveStorage {
  load(slot: number): SaveData | null;
  save(slot: number, data: SaveData): void;
  clear(slot: number): void;
  exists(slot: number): boolean;
}

const STORAGE_KEY = (slot: number): string => `stranger-walk:save:${slot}`;
/** До слотов было одно сохранение на весь браузер — переносим его в слот 0, если он ещё пуст. */
const LEGACY_KEY = 'stranger-walk:save';

const migrateLegacySave = (): void => {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === null) return;
    if (localStorage.getItem(STORAGE_KEY(0)) === null) localStorage.setItem(STORAGE_KEY(0), legacy);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Хранилище недоступно — переносить нечего.
  }
};
migrateLegacySave();

export const localSaveStorage: SaveStorage = {
  load: (slot) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(slot));
      return raw === null ? null : parseSave(JSON.parse(raw));
    } catch {
      return null;
    }
  },
  save: (slot, data) => {
    try {
      localStorage.setItem(STORAGE_KEY(slot), JSON.stringify(data));
    } catch {
      // Хранилище недоступно или переполнено — игра продолжается без сохранения.
    }
  },
  clear: (slot) => {
    try {
      localStorage.removeItem(STORAGE_KEY(slot));
    } catch {
      // Нечего очищать.
    }
  },
  exists: (slot) => localSaveStorage.load(slot) !== null,
};
