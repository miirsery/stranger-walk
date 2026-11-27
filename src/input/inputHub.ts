import type { MoveInput } from '@core/world/world';

type ActionListener = () => void;

/** Форма совпадает с `KeyBindings` из `ui/stores/settings` — хаб не зависит от Vue-слоя. */
export interface InputKeyBindings {
  moveUp: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
  action: string;
}

/** Стрелки и Space/Enter всегда работают в своей роли — запасной путь поверх переназначаемых клавиш. */
const FIXED_MOVE_KEYS: Record<string, MoveInput> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};
const FIXED_ACTION_KEYS = new Set(['Space', 'Enter']);

const MOVE_DIRECTION_BY_ROLE: Record<'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight', MoveInput> = {
  moveUp: { x: 0, y: -1 },
  moveDown: { x: 0, y: 1 },
  moveLeft: { x: -1, y: 0 },
  moveRight: { x: 1, y: 0 },
};

/** Стандартная раскладка геймпада: крестовина — кнопки 12–15, кнопка действия переназначаема. */
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
  private padActionButton = 0;
  /** Переназначаемые «основные» клавиши движения; стрелки поверх них — см. `FIXED_MOVE_KEYS`. */
  private configuredMoveKeys: Record<string, MoveInput> = {
    KeyW: MOVE_DIRECTION_BY_ROLE.moveUp,
    KeyS: MOVE_DIRECTION_BY_ROLE.moveDown,
    KeyA: MOVE_DIRECTION_BY_ROLE.moveLeft,
    KeyD: MOVE_DIRECTION_BY_ROLE.moveRight,
  };
  private primaryActionKey = 'KeyE';

  /** Переназначает «основные» клавиши движения и действия (стрелки и Space/Enter остаются запасным путём). */
  setKeyBindings(bindings: InputKeyBindings): void {
    this.configuredMoveKeys = {
      [bindings.moveUp]: MOVE_DIRECTION_BY_ROLE.moveUp,
      [bindings.moveDown]: MOVE_DIRECTION_BY_ROLE.moveDown,
      [bindings.moveLeft]: MOVE_DIRECTION_BY_ROLE.moveLeft,
      [bindings.moveRight]: MOVE_DIRECTION_BY_ROLE.moveRight,
    };
    this.primaryActionKey = bindings.action;
  }

  /** Переназначает кнопку геймпада, которая считается «действием» (по умолчанию 0 — A/крест). */
  setPadActionButton(index: number): void {
    this.padActionButton = index;
  }

  /** Подключает клавиатуру. Возвращает функцию отключения. */
  attachKeyboard(target: Window): () => void {
    const onKeyDown = (event: KeyboardEvent): void => {
      const direction = FIXED_MOVE_KEYS[event.code] ?? this.configuredMoveKeys[event.code];
      if (direction) {
        this.pressed.add(event.code);
        event.preventDefault();
      } else if (FIXED_ACTION_KEYS.has(event.code) || event.code === this.primaryActionKey) {
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
    for (const listener of Array.from(this.actionListeners)) listener();
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
      const direction = FIXED_MOVE_KEYS[code] ?? this.configuredMoveKeys[code];
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

    const action = held(this.padActionButton);
    if (action && !this.padActionHeld) this.triggerAction();
    this.padActionHeld = action;

    return {
      x: axis(0) + Number(held(PAD_RIGHT)) - Number(held(PAD_LEFT)),
      y: axis(1) + Number(held(PAD_DOWN)) - Number(held(PAD_UP)),
    };
  }
}
