import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { audio } from '@/audio/chiptune';

export type TouchControlsMode = 'auto' | 'on' | 'off';

interface StoredSettings {
  musicVolume: number;
  sfxVolume: number;
  touchControls: TouchControlsMode;
}

// v2: тихая громкость по умолчанию — старые сохранённые значения не подхватываются.
const STORAGE_KEY = 'stranger-walk:settings:v2';
const DEFAULTS: StoredSettings = { musicVolume: 0.15, sfxVolume: 0.25, touchControls: 'auto' };

const clamp01 = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;

const load = (): StoredSettings => {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    const data = typeof raw === 'object' && raw !== null ? (raw as Partial<Record<keyof StoredSettings, unknown>>) : {};
    const touch = data.touchControls;
    return {
      musicVolume: clamp01(data.musicVolume, DEFAULTS.musicVolume),
      sfxVolume: clamp01(data.sfxVolume, DEFAULTS.sfxVolume),
      touchControls: touch === 'on' || touch === 'off' || touch === 'auto' ? touch : DEFAULTS.touchControls,
    };
  } catch {
    return { ...DEFAULTS };
  }
};

/** Настройки приложения (не прогресс игры): громкость и сенсорное управление. */
export const useSettingsStore = defineStore('settings', () => {
  const initial = load();
  const musicVolume = ref(initial.musicVolume);
  const sfxVolume = ref(initial.sfxVolume);
  const touchControls = ref<TouchControlsMode>(initial.touchControls);

  watch(
    [musicVolume, sfxVolume, touchControls],
    () => {
      audio.setMusicVolume(musicVolume.value);
      audio.setSfxVolume(sfxVolume.value);
      try {
        const data: StoredSettings = {
          musicVolume: musicVolume.value,
          sfxVolume: sfxVolume.value,
          touchControls: touchControls.value,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // Хранилище недоступно (приватный режим) — настройки живут до перезагрузки.
      }
    },
    { immediate: true },
  );

  return { musicVolume, sfxVolume, touchControls };
});
