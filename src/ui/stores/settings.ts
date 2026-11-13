import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { audio } from '@/audio/chiptune';

export type TouchControlsMode = 'auto' | 'on' | 'off';

/** Размер интерфейса: «авто» подбирает его по размеру окна. */
export const UI_SCALES = ['auto', 1, 1.25, 1.5, 2, 2.5, 3] as const;
export type UiScale = (typeof UI_SCALES)[number];

/** Интерфейс рассчитан на окно 1280×720; на больших экранах он увеличивается шагами по 0,25. */
export const autoUiScale = (width: number, height: number): number => {
  const fit = Math.min(width / 1280, height / 720);
  return Math.max(1, Math.min(3, Math.floor(fit * 4) / 4));
};

interface StoredSettings {
  musicVolume: number;
  sfxVolume: number;
  touchControls: TouchControlsMode;
  /** Игрок уже прошёл (или пропустил) обучение карточному бою. */
  battleTutorialDone: boolean;
  uiScale: UiScale;
}

// v3: музыка по умолчанию выключена — старые сохранённые значения не подхватываются.
const STORAGE_KEY = 'stranger-walk:settings:v3';
const DEFAULTS: StoredSettings = { musicVolume: 0, sfxVolume: 0.25, touchControls: 'auto', battleTutorialDone: false, uiScale: 'auto' };

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
      battleTutorialDone: data.battleTutorialDone === true,
      uiScale: UI_SCALES.find((scale) => scale === data.uiScale) ?? DEFAULTS.uiScale,
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
  const battleTutorialDone = ref(initial.battleTutorialDone);
  const uiScale = ref<UiScale>(initial.uiScale);

  watch(
    [musicVolume, sfxVolume, touchControls, battleTutorialDone, uiScale],
    () => {
      audio.setMusicVolume(musicVolume.value);
      audio.setSfxVolume(sfxVolume.value);
      try {
        const data: StoredSettings = {
          musicVolume: musicVolume.value,
          sfxVolume: sfxVolume.value,
          touchControls: touchControls.value,
          battleTutorialDone: battleTutorialDone.value,
          uiScale: uiScale.value,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // Хранилище недоступно (приватный режим) — настройки живут до перезагрузки.
      }
    },
    { immediate: true },
  );

  return { musicVolume, sfxVolume, touchControls, battleTutorialDone, uiScale };
});
