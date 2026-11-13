const STORAGE_KEY = 'stranger-walk:debug';

/**
 * Режим отладки включён в dev-сборке всегда, а на опубликованном сайте — по параметру
 * `?debug=1` в адресе (запоминается до закрытия вкладки; `?debug=0` выключает).
 */
export const isDebugEnabled = (): boolean => {
  if (import.meta.env.DEV) return true;
  try {
    const flag = new URLSearchParams(window.location.search).get('debug');
    if (flag === '1') sessionStorage.setItem(STORAGE_KEY, '1');
    if (flag === '0') sessionStorage.removeItem(STORAGE_KEY);
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};
