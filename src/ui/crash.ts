import { shallowRef } from 'vue';
import { recordCrash } from './errorReporting';

/** true, когда поймана ошибка, которую не стоит показывать игроку как сломанный экран. */
export const crashed = shallowRef(false);
export const crashMessage = shallowRef('');

const describe = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'Неизвестная ошибка';
};

const stackOf = (error: unknown): string | undefined => (error instanceof Error ? error.stack : undefined);

/** Общая точка входа для всех источников ошибок: Vue, window.onerror, unhandledrejection. */
export const reportCrash = (error: unknown): void => {
  console.error(error);
  const message = describe(error);
  crashMessage.value = message;
  crashed.value = true;
  recordCrash(message, stackOf(error));
};
