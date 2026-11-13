<script setup lang="ts">
import type { InputHub } from '@/input/inputHub';
import { onBeforeUnmount, ref } from 'vue';

const props = defineProps<{ input: InputHub }>();

/** Радиус хода ручки в пикселях и «мёртвая зона» в долях радиуса. */
const RADIUS = 44;
const DEAD_ZONE = 0.18;

const knob = ref({ x: 0, y: 0 });
const active = ref(false);
let origin = { x: 0, y: 0 };

const move = (event: PointerEvent): void => {
  let dx = (event.clientX - origin.x) / RADIUS;
  let dy = (event.clientY - origin.y) / RADIUS;
  const length = Math.hypot(dx, dy);
  if (length > 1) {
    dx /= length;
    dy /= length;
  }
  knob.value = { x: dx * RADIUS, y: dy * RADIUS };
  // Внутри мёртвой зоны персонаж стоит; дальше скорость растёт вместе с отклонением.
  if (length < DEAD_ZONE) props.input.setVirtualMove(0, 0);
  else props.input.setVirtualMove(dx, dy);
};

const start = (event: PointerEvent): void => {
  const target = event.currentTarget as HTMLElement;
  // Захват указателя: стик продолжает слушаться, даже если палец ушёл за его пределы.
  // Захват может не удаться (указатель уже отпущен) — джойстик работает и без него.
  try {
    target.setPointerCapture(event.pointerId);
  } catch {
    // Продолжаем без захвата.
  }
  const rect = target.getBoundingClientRect();
  origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  active.value = true;
  move(event);
};

const drag = (event: PointerEvent): void => {
  if (active.value) move(event);
};

const end = (): void => {
  active.value = false;
  knob.value = { x: 0, y: 0 };
  props.input.setVirtualMove(0, 0);
};

onBeforeUnmount(() => props.input.setVirtualMove(0, 0));
</script>

<template>
  <div class="touch">
    <div
      class="touch__stick"
      :class="{ 'touch__stick--active': active }"
      role="application"
      aria-label="Джойстик движения"
      @pointerdown.prevent="start"
      @pointermove="drag"
      @pointerup="end"
      @pointercancel="end"
      @contextmenu.prevent
    >
      <span class="touch__knob" :style="{ transform: `translate(${knob.x}px, ${knob.y}px)` }" />
    </div>
    <button
      type="button"
      class="touch__action"
      aria-label="Действие"
      @pointerdown.prevent="input.triggerAction()"
      @contextmenu.prevent
    >
      A
    </button>
  </div>
</template>

<style scoped>
.touch {
  position: absolute;
  right: max(16px, env(safe-area-inset-right));
  bottom: max(16px, env(safe-area-inset-bottom));
  left: max(16px, env(safe-area-inset-left));
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  pointer-events: none;
  user-select: none;
  touch-action: none;
}

.touch__stick {
  display: grid;
  place-items: center;
  width: 136px;
  height: 136px;
  pointer-events: auto;
  touch-action: none;
  background: rgb(42 37 64 / 55%);
  border: var(--px) solid var(--ink);
  box-shadow: inset 0 0 0 2px var(--edge);
}

.touch__knob {
  width: 48px;
  height: 48px;
  pointer-events: none;
  background: rgb(93 85 132 / 90%);
  border: var(--px) solid var(--ink);
  box-shadow: inset 0 0 0 2px var(--text);
}

.touch__stick--active .touch__knob {
  background: var(--gold);
}

.touch__action {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  padding: 0;
  font: inherit;
  font-size: 20px;
  color: var(--ink);
  pointer-events: auto;
  touch-action: none;
  background: rgb(242 201 76 / 90%);
  border: var(--px) solid var(--ink);
  box-shadow: inset 0 0 0 2px var(--edge);
}

.touch__action:active {
  background: var(--text);
}
</style>
