import type { SaveData } from '@core/session/save';
import { parseSave } from '@core/session/save';

/**
 * Куда складывать сохранение. Сейчас — localStorage браузера; на других платформах
 * или при синхронизации с бэкендом достаточно другой реализации этого интерфейса.
 */
export interface SaveStorage {
  load(): SaveData | null;
  save(data: SaveData): void;
  clear(): void;
  exists(): boolean;
}

const STORAGE_KEY = 'stranger-walk:save';

export const localSaveStorage: SaveStorage = {
  load: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw === null ? null : parseSave(JSON.parse(raw));
    } catch {
      return null;
    }
  },
  save: (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Хранилище недоступно или переполнено — игра продолжается без сохранения.
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Нечего очищать.
    }
  },
  exists: () => localSaveStorage.load() !== null,
};
