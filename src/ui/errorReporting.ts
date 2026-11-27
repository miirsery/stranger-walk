/**
 * Сбор ошибок в проде: каждое падение (см. `crash.ts`) сохраняется локально — журнал виден
 * в отладочной панели (`?debug=1`) даже без доступа к консоли игрока. Если задана переменная
 * сборки `VITE_ERROR_REPORT_URL`, отчёт дополнительно уходит туда POST-запросом — своему
 * самостоятельно размещённому коллектору или Sentry-совместимому приёмнику. Без неё (по
 * умолчанию) ничего никуда не отправляется — только локальный журнал.
 */
export interface CrashReport {
  message: string;
  stack?: string;
  timestamp: number;
  url: string;
  userAgent: string;
  /** Последнее известное состояние игры на момент падения — см. `setCrashContext`. */
  context: Record<string, unknown>;
}

const STORAGE_KEY = 'stranger-walk:crash-log';
const MAX_ENTRIES = 20;

let context: Record<string, unknown> = {};

/** Обновляет контекст (уровень, режим, цикл NG+…) — попадёт в следующий отчёт о падении. */
export const setCrashContext = (patch: Record<string, unknown>): void => {
  context = { ...context, ...patch };
};

const loadLog = (): CrashReport[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CrashReport[]) : [];
  } catch {
    return [];
  }
};

/** Локальный журнал падений, новые — последними. Доступен из отладочной панели. */
export const crashLog = (): CrashReport[] => loadLog();

export const clearCrashLog = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Нечего очищать.
  }
};

/** Сохраняет отчёт локально и, если настроено, отправляет его во внешний коллектор. */
export const recordCrash = (message: string, stack: string | undefined): void => {
  const report: CrashReport = {
    message,
    stack,
    timestamp: Date.now(),
    url: location.href,
    userAgent: navigator.userAgent,
    context,
  };
  try {
    const log = [...loadLog(), report].slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // Хранилище недоступно или переполнено — отчёт останется хотя бы в консоли (см. crash.ts).
  }

  const endpoint = import.meta.env.VITE_ERROR_REPORT_URL as string | undefined;
  if (!endpoint) return;
  try {
    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      keepalive: true,
    }).catch(() => {
      // Коллектор недоступен — отчёт уже сохранён локально, повторять не нужно.
    });
  } catch {
    // Например, окружение без fetch — локальный журнал всё равно записан.
  }
};
