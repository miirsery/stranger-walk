import { shallowRef } from 'vue';

/** true, когда поймана ошибка, которую не стоит показывать игроку как сломанный экран. */
export const crashed = shallowRef(false);
export const crashMessage = shallowRef('');

const describe = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'Неизвестная ошибка';
};

/** Общая точка входа для всех источников ошибок: Vue, window.onerror, unhandledrejection. */
export const reportCrash = (error: unknown): void => {
  console.error(error);
  crashMessage.value = describe(error);
  crashed.value = true;
};
