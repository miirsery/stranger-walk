<script setup lang="ts">
import type { InputHub } from '@/input/inputHub';
import { onBeforeUnmount, reactive } from 'vue';

const props = defineProps<{ input: InputHub }>();

type Direction = 'up' | 'down' | 'left' | 'right';

const held = reactive<Record<Direction, boolean>>({ up: false, down: false, left: false, right: false });

const sync = (): void => {
  props.input.setVirtualMove(Number(held.right) - Number(held.left), Number(held.down) - Number(held.up));
};

const press = (direction: Direction, event: PointerEvent): void => {
  // Захват указателя: кнопка «отпустится», даже если палец съехал за её пределы.
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  held[direction] = true;
  sync();
};

const release = (direction: Direction): void => {
  held[direction] = false;
  sync();
};

const directions: { id: Direction; label: string; glyph: string }[] = [
  { id: 'up', label: 'Вверх', glyph: '▲' },
  { id: 'left', label: 'Влево', glyph: '◀' },
  { id: 'right', label: 'Вправо', glyph: '▶' },
  { id: 'down', label: 'Вниз', glyph: '▼' },
];

onBeforeUnmount(() => props.input.setVirtualMove(0, 0));
</script>

<template>
  <div class="touch">
    <div class="touch__pad">
      <button
        v-for="direction in directions"
        :key="direction.id"
        type="button"
        class="touch__button"
        :class="[`touch__button--${direction.id}`, { 'touch__button--held': held[direction.id] }]"
        :aria-label="direction.label"
        @pointerdown.prevent="press(direction.id, $event)"
        @pointerup="release(direction.id)"
        @pointercancel="release(direction.id)"
        @contextmenu.prevent
      >
        {{ direction.glyph }}
      </button>
    </div>
    <button
      type="button"
      class="touch__button touch__action"
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

.touch__pad {
  display: grid;
  grid-template: repeat(3, 48px) / repeat(3, 48px);
}

.touch__button {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  font-size: 14px;
  color: var(--text);
  pointer-events: auto;
  touch-action: none;
  background: rgb(59 53 88 / 80%);
  border: var(--px) solid var(--ink);
  box-shadow: inset 0 0 0 2px var(--edge);
}

.touch__button--held,
.touch__button:active {
  color: var(--ink);
  background: var(--gold);
}

.touch__button--up {
  grid-area: 1 / 2;
}

.touch__button--left {
  grid-area: 2 / 1;
}

.touch__button--right {
  grid-area: 2 / 3;
}

.touch__button--down {
  grid-area: 3 / 2;
}

.touch__action {
  width: 72px;
  height: 72px;
  font-size: 20px;
  color: var(--ink);
  background: rgb(242 201 76 / 90%);
}
</style>
