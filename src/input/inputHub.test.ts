import { describe, expect, it } from 'vitest';
import type { PadState } from './inputHub';
import { InputHub } from './inputHub';

const pad = (axes: number[], pressed: number[] = []): PadState => ({
  axes,
  buttons: Array.from({ length: 16 }, (_, index) => ({ pressed: pressed.includes(index) })),
});

/** Мини-реализация `Window` для `attachKeyboard`: только то, чем пользуется хаб. */
const fakeWindow = (): { target: Window; keydown: (code: string, repeat?: boolean) => void; keyup: (code: string) => void } => {
  const listeners: Record<string, ((event: KeyboardEvent) => void)[]> = {};
  const target = {
    addEventListener: (type: string, listener: EventListener) => {
      (listeners[type] ??= []).push(listener as (event: KeyboardEvent) => void);
    },
    removeEventListener: (type: string, listener: EventListener) => {
      listeners[type] = (listeners[type] ?? []).filter((candidate) => candidate !== (listener as (event: KeyboardEvent) => void));
    },
  } as unknown as Window;
  const fire = (type: string, code: string, repeat: boolean): void => {
    const event = { code, repeat, preventDefault: () => {} } as KeyboardEvent;
    for (const listener of listeners[type] ?? []) listener(event);
  };
  return {
    target,
    keydown: (code, repeat = false) => fire('keydown', code, repeat),
    keyup: (code) => fire('keyup', code, false),
  };
};

describe('InputHub', () => {
  it('без источников ввода персонаж стоит', () => {
    expect(new InputHub().getMove()).toEqual({ x: 0, y: 0 });
  });

  it('сенсорный джойстик передаёт аналоговое значение', () => {
    const hub = new InputHub();
    hub.setVirtualMove(0.5, -0.25);
    expect(hub.getMove()).toEqual({ x: 0.5, y: -0.25 });
  });

  it('стик геймпада двигает, мёртвая зона гасит дрожание', () => {
    const hub = new InputHub();
    let state: PadState | null = pad([0.1, -0.2]);
    hub.attachGamepad(() => [null, state]);
    expect(hub.getMove()).toEqual({ x: 0, y: 0 });
    state = pad([0.8, -0.6]);
    expect(hub.getMove()).toEqual({ x: 0.8, y: -0.6 });
  });

  it('крестовина геймпада работает как стрелки, сумма источников ограничена единицей', () => {
    const hub = new InputHub();
    hub.attachGamepad(() => [pad([0.9, 0], [15, 12])]);
    hub.setVirtualMove(1, 0);
    expect(hub.getMove()).toEqual({ x: 1, y: -1 });
  });

  it('кнопка A вызывает действие один раз за нажатие', () => {
    const hub = new InputHub();
    let state = pad([0, 0], [0]);
    hub.attachGamepad(() => [state]);
    let actions = 0;
    hub.onAction(() => actions++);
    hub.getMove();
    hub.getMove();
    expect(actions).toBe(1);
    state = pad([0, 0]);
    hub.getMove();
    state = pad([0, 0], [0]);
    hub.getMove();
    expect(actions).toBe(2);
  });

  it('после отключения геймпад не влияет на ввод', () => {
    const hub = new InputHub();
    const detach = hub.attachGamepad(() => [pad([1, 1])]);
    detach();
    expect(hub.getMove()).toEqual({ x: 0, y: 0 });
  });

  it('клавиатура по умолчанию: WASD двигает, E вызывает действие, стрелки и Space — всегда', () => {
    const hub = new InputHub();
    const { target, keydown, keyup } = fakeWindow();
    hub.attachKeyboard(target);
    keydown('KeyW');
    expect(hub.getMove()).toEqual({ x: 0, y: -1 });
    keyup('KeyW');
    keydown('ArrowRight');
    expect(hub.getMove()).toEqual({ x: 1, y: 0 });
    keyup('ArrowRight');

    let actions = 0;
    hub.onAction(() => actions++);
    keydown('KeyE');
    expect(actions).toBe(1);
    keydown('Space');
    expect(actions).toBe(2);
  });

  it('setKeyBindings переназначает основную клавишу движения, не трогая стрелки', () => {
    const hub = new InputHub();
    const { target, keydown, keyup } = fakeWindow();
    hub.attachKeyboard(target);
    hub.setKeyBindings({ moveUp: 'KeyI', moveDown: 'KeyK', moveLeft: 'KeyJ', moveRight: 'KeyL', action: 'KeyE' });

    keydown('KeyW');
    expect(hub.getMove()).toEqual({ x: 0, y: 0 }); // старая клавиша больше не двигает
    keyup('KeyW');

    keydown('KeyI');
    expect(hub.getMove()).toEqual({ x: 0, y: -1 });
    keyup('KeyI');

    keydown('ArrowDown');
    expect(hub.getMove()).toEqual({ x: 0, y: 1 }); // стрелки — запасной путь, не переназначаются
  });

  it('setKeyBindings переназначает клавишу действия, Space/Enter остаются запасным путём', () => {
    const hub = new InputHub();
    const { target, keydown } = fakeWindow();
    hub.attachKeyboard(target);
    hub.setKeyBindings({ moveUp: 'KeyW', moveDown: 'KeyS', moveLeft: 'KeyA', moveRight: 'KeyD', action: 'KeyF' });

    let actions = 0;
    hub.onAction(() => actions++);
    keydown('KeyE');
    expect(actions).toBe(0); // старая клавиша действия больше не работает
    keydown('KeyF');
    expect(actions).toBe(1);
    keydown('Enter');
    expect(actions).toBe(2);
  });

  it('setPadActionButton переназначает кнопку геймпада, которая считается действием', () => {
    const hub = new InputHub();
    let state = pad([0, 0], [0]);
    hub.attachGamepad(() => [state]);
    hub.setPadActionButton(1);

    let actions = 0;
    hub.onAction(() => actions++);
    hub.getMove();
    expect(actions).toBe(0); // кнопка 0 (старое действие) больше не считается

    state = pad([0, 0], [1]);
    hub.getMove();
    expect(actions).toBe(1);
  });
});
