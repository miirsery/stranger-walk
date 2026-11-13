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

/** Стандартная раскладка геймпада: A/крест — действие, крестовина — кнопки 12–15. */
const PAD_ACTION = 0;
const PAD_UP = 12;
const PAD_DOWN = 13;
const PAD_LEFT = 14;
const PAD_RIGHT = 15;
const PAD_DEAD_ZONE = 0.25;

/** Минимум от Gamepad API, который нужен хабу, — чтобы его можно было подменить в тестах. */
export interface PadState {
  axes: readonly number[];
  buttons: readonly { pressed: boolean }[];
}

export type PadSource = () => readonly (PadState | null)[];

/**
 * Единая точка ввода. Клавиатура и сенсорные кнопки сводятся к одному `MoveInput`
 * и событию «действие» — ядру игры всё равно, откуда пришёл ввод.
 * Геймпад — третий источник: стик и крестовина двигают, кнопка A — действие.
 */
export class InputHub {
  private readonly pressed = new Set<string>();
  private readonly virtual: MoveInput = { x: 0, y: 0 };
  private readonly actionListeners = new Set<ActionListener>();
  private padSource: PadSource | null = null;
  private padActionHeld = false;

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

  /**
   * Подключает геймпады. Источник опрашивается при каждом `getMove()` (раз в кадр):
   * у Gamepad API нет событий нажатий, только текущее состояние.
   */
  attachGamepad(source: PadSource): () => void {
    this.padSource = source;
    return () => {
      this.padSource = null;
      this.padActionHeld = false;
    };
  }

  /** Сенсорный джойстик: значения -1..1 по каждой оси. */
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
    const pad = this.readPad();
    x += pad.x;
    y += pad.y;
    return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
  }

  /** Читает первый подключённый геймпад и по фронту кнопки A вызывает «действие». */
  private readPad(): MoveInput {
    const pad = this.padSource?.().find((candidate) => candidate !== null);
    if (!pad) {
      this.padActionHeld = false;
      return { x: 0, y: 0 };
    }
    const held = (index: number): boolean => pad.buttons[index]?.pressed ?? false;
    const axis = (index: number): number => {
      const value = pad.axes[index] ?? 0;
      return Math.abs(value) < PAD_DEAD_ZONE ? 0 : value;
    };

    const action = held(PAD_ACTION);
    if (action && !this.padActionHeld) this.triggerAction();
    this.padActionHeld = action;

    return {
      x: axis(0) + Number(held(PAD_RIGHT)) - Number(held(PAD_LEFT)),
      y: axis(1) + Number(held(PAD_DOWN)) - Number(held(PAD_UP)),
    };
  }
}
