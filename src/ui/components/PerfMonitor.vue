<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * Счётчик FPS и памяти для профилирования на слабых устройствах (см. `PERF_TESTING.md`).
 * Память доступна только через нестандартный `performance.memory` (Chrome/Chromium) —
 * в остальных браузерах просто не показывается.
 */
const fps = ref(0);
const memoryMb = ref<number | null>(null);

const UPDATE_MS = 500;
let frames = 0;
let windowStart = 0;
let frame = 0;

interface ChromeMemory {
  usedJSHeapSize: number;
}

const readMemoryMb = (): number | null => {
  const memory = (performance as Performance & { memory?: ChromeMemory }).memory;
  return memory ? Math.round(memory.usedJSHeapSize / (1024 * 1024)) : null;
};

const tick = (time: number): void => {
  frames += 1;
  const elapsed = time - windowStart;
  if (elapsed >= UPDATE_MS) {
    fps.value = Math.round((frames * 1000) / elapsed);
    frames = 0;
    windowStart = time;
    memoryMb.value = readMemoryMb();
  }
  frame = requestAnimationFrame(tick);
};

onMounted(() => {
  windowStart = performance.now();
  frame = requestAnimationFrame(tick);
});
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <div class="perf" aria-hidden="true">FPS: {{ fps }}<span v-if="memoryMb !== null"> · Память: {{ memoryMb }} МБ</span></div>
</template>

<style scoped>
/* Та же правая колонка, что у кнопок паузы (top:12) и DBG (top:60) — ещё один ряд под ними. */
.perf {
  position: absolute;
  top: 108px;
  right: 12px;
  z-index: 6;
  padding: 4px 8px;
  font-size: 8px;
  color: var(--green);
  background: rgb(20 18 31 / 75%);
  pointer-events: none;
}
</style>
