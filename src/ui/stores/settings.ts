import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { audio } from '@/audio/chiptune';

export type TouchControlsMode = 'auto' | 'on' | 'off';

/** Скорость появления текста диалогов; «мгновенно» показывает реплику целиком сразу. */
export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';
export const TEXT_SPEEDS: TextSpeed[] = ['slow', 'normal', 'fast', 'instant'];
/** Символов в секунду для анимированных скоростей — `instant` показывает текст без анимации. */
export const TEXT_SPEED_CPS: Record<TextSpeed, number> = { slow: 18, normal: 36, fast: 64, instant: Infinity };

/** Какие действия можно переназначить — у каждого одна клавиша. */
export type BindableKey = 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight' | 'action' | 'pause' | 'deck' | 'journal';
export const BINDABLE_KEYS: BindableKey[] = ['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'action', 'pause', 'deck', 'journal'];
export const BINDABLE_KEY_LABELS: Record<BindableKey, string> = {
  moveUp: 'Вверх',
  moveDown: 'Вниз',
  moveLeft: 'Влево',
  moveRight: 'Вправо',
  action: 'Действие',
  pause: 'Пауза',
  deck: 'Колода',
  journal: 'Журнал',
};
export type KeyBindings = Record<BindableKey, string>;
/** Стрелки и Space/Enter всегда работают в своей роли (движение/действие) — это лишь запасной,
 * не отображаемый в настройках путь; переназначить можно только эти «основные» клавиши. */
export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  moveUp: 'KeyW',
  moveDown: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  action: 'KeyE',
  pause: 'Escape',
  deck: 'KeyC',
  journal: 'KeyJ',
};
export const DEFAULT_PAD_ACTION_BUTTON = 0;

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
  textSpeed: TextSpeed;
  /** Контрастная палитра и небезопасные для цветовосприятия оттенки заменены — см. `main.css`. */
  highContrast: boolean;
  keyBindings: KeyBindings;
  /** Индекс кнопки геймпада для «действия» (0 — A/крест, стандарт Gamepad API). */
  padActionButton: number;
  /** Последняя версия, для которой показан экран «что нового»; '' — ещё ни разу. */
  lastSeenVersion: string;
}

// v3: музыка по умолчанию выключена — старые сохранённые значения не подхватываются.
const STORAGE_KEY = 'stranger-walk:settings:v3';
const DEFAULTS: StoredSettings = {
  musicVolume: 0,
  sfxVolume: 0.25,
  touchControls: 'auto',
  battleTutorialDone: false,
  uiScale: 'auto',
  textSpeed: 'normal',
  highContrast: false,
  keyBindings: DEFAULT_KEY_BINDINGS,
  padActionButton: DEFAULT_PAD_ACTION_BUTTON,
  lastSeenVersion: '',
};

const loadKeyBindings = (value: unknown): KeyBindings => {
  const data = typeof value === 'object' && value !== null ? (value as Partial<Record<BindableKey, unknown>>) : {};
  const result = { ...DEFAULT_KEY_BINDINGS };
  for (const key of BINDABLE_KEYS) {
    const code = data[key];
    if (typeof code === 'string' && code.length > 0) result[key] = code;
  }
  return result;
};

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
      textSpeed: TEXT_SPEEDS.find((speed) => speed === data.textSpeed) ?? DEFAULTS.textSpeed,
      highContrast: data.highContrast === true,
      keyBindings: loadKeyBindings(data.keyBindings),
      padActionButton:
        typeof data.padActionButton === 'number' && Number.isInteger(data.padActionButton) && data.padActionButton >= 0
          ? data.padActionButton
          : DEFAULTS.padActionButton,
      lastSeenVersion: typeof data.lastSeenVersion === 'string' ? data.lastSeenVersion : DEFAULTS.lastSeenVersion,
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
  const textSpeed = ref<TextSpeed>(initial.textSpeed);
  const highContrast = ref(initial.highContrast);
  const keyBindings = ref<KeyBindings>(initial.keyBindings);
  const padActionButton = ref(initial.padActionButton);
  const lastSeenVersion = ref(initial.lastSeenVersion);

  watch(
    [
      musicVolume,
      sfxVolume,
      touchControls,
      battleTutorialDone,
      uiScale,
      textSpeed,
      highContrast,
      keyBindings,
      padActionButton,
      lastSeenVersion,
    ],
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
          textSpeed: textSpeed.value,
          highContrast: highContrast.value,
          keyBindings: keyBindings.value,
          padActionButton: padActionButton.value,
          lastSeenVersion: lastSeenVersion.value,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // Хранилище недоступно (приватный режим) — настройки живут до перезагрузки.
      }
    },
    { deep: true, immediate: true },
  );

  return {
    musicVolume,
    sfxVolume,
    touchControls,
    battleTutorialDone,
    uiScale,
    textSpeed,
    highContrast,
    keyBindings,
    padActionButton,
    lastSeenVersion,
  };
});
