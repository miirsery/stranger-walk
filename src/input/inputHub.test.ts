import { describe, expect, it } from 'vitest';
import type { PadState } from './inputHub';
import { InputHub } from './inputHub';

const pad = (axes: number[], pressed: number[] = []): PadState => ({
  axes,
  buttons: Array.from({ length: 16 }, (_, index) => ({ pressed: pressed.includes(index) })),
});

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
});
