import { watch } from 'vue';
import { useSettingsStore } from '../stores/settings';

/** Держит атрибут `data-contrast` корня в соответствии с настройкой — палитра переопределена в `main.css`. */
export const useAccessibility = (): void => {
  const settings = useSettingsStore();

  watch(
    () => settings.highContrast,
    (highContrast) => {
      document.documentElement.toggleAttribute('data-contrast', highContrast);
    },
    { immediate: true },
  );
};
