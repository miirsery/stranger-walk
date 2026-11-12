import type { MoveInput } from '@core/world/world';

type ActionListener = () => void;

const MOVE_KEYS: Record<string, MoveInput> = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

const ACTION_KEYS = new Set(['KeyE', 'Space', 'Enter']);

/**
 * Единая точка ввода. Клавиатура и сенсорные кнопки сводятся к одному `MoveInput`
 * и событию «действие» — ядру игры всё равно, откуда пришёл ввод.
 * Геймпад на будущих платформах добавляется сюда же третьим источником.
 */
export class InputHub {
  private readonly pressed = new Set<string>();
  private readonly virtual: MoveInput = { x: 0, y: 0 };
  private readonly actionListeners = new Set<ActionListener>();

  /** Подключает клавиатуру. Возвращает функцию отключения. */
  attachKeyboard(target: Window): () => void {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.code in MOVE_KEYS) {
        this.pressed.add(event.code);
        event.preventDefault();
      } else if (ACTION_KEYS.has(event.code)) {
        event.preventDefault();
        if (!event.repeat) this.triggerAction();
      }
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      this.pressed.delete(event.code);
    };
    const onBlur = (): void => this.pressed.clear();

    target.addEventListener('keydown', onKeyDown);
    target.addEventListener('keyup', onKeyUp);
    target.addEventListener('blur', onBlur);
    return () => {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', onBlur);
      this.pressed.clear();
    };
  }

  /** Сенсорный D-pad / джойстик. */
  setVirtualMove(x: number, y: number): void {
    this.virtual.x = x;
    this.virtual.y = y;
  }

  triggerAction(): void {
    for (const listener of [...this.actionListeners]) listener();
  }

  onAction(listener: ActionListener): () => void {
    this.actionListeners.add(listener);
    return () => {
      this.actionListeners.delete(listener);
    };
  }

  getMove(): MoveInput {
    let x = this.virtual.x;
    let y = this.virtual.y;
    for (const code of this.pressed) {
      const direction = MOVE_KEYS[code];
      if (direction) {
        x += direction.x;
        y += direction.y;
      }
    }
    return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
  }
}
