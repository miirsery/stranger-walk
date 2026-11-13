import { onBeforeUnmount, onMounted, watch } from 'vue';
import { autoUiScale, useSettingsStore } from '../stores/settings';

/**
 * Держит CSS-переменную `--ui-scale` в соответствии с настройкой и размером окна.
 * Элементы с классом `ui-scale` увеличиваются целиком; игровой канвас масштабируется отдельно.
 */
export const useUiScale = (): void => {
  const settings = useSettingsStore();

  const apply = (): void => {
    const scale = settings.uiScale === 'auto' ? autoUiScale(window.innerWidth, window.innerHeight) : settings.uiScale;
    document.documentElement.style.setProperty('--ui-scale', String(scale));
  };

  watch(() => settings.uiScale, apply, { immediate: true });
  onMounted(() => window.addEventListener('resize', apply));
  onBeforeUnmount(() => window.removeEventListener('resize', apply));
};
