export type Listener<T> = (event: T) => void;
export type Unsubscribe = () => void;

/** Минимальная типизированная шина событий без зависимостей от платформы. */
export class Emitter<T> {
  private readonly listeners = new Set<Listener<T>>();

  on(listener: Listener<T>): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: T): void {
    for (const listener of [...this.listeners]) listener(event);
  }

  clear(): void {
    this.listeners.clear();
  }
}
