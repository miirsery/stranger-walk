<script setup lang="ts">
import type { GameSession } from '@core/session/gameSession';
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue';

const props = defineProps<{ session: GameSession }>();

const tiles = shallowRef<number[]>([]);
const size = shallowRef(3);
let frame = 0;
let signature = '';

// Плитки двигаются по клику, но перерисовываем в ритме кадра — проще, чем событие на каждый ход.
const tick = (): void => {
  const mode = props.session.mode;
  if (mode.kind === 'minigame' && mode.game.type === 'slide') {
    const next = mode.game.tiles.join(',');
    if (next !== signature) {
      signature = next;
      tiles.value = [...mode.game.tiles];
      size.value = mode.game.size;
    }
  }
  frame = requestAnimationFrame(tick);
};

const move = (index: number): void => {
  const mode = props.session.mode;
  if (mode.kind === 'minigame' && mode.game.type === 'slide') mode.game.move(index);
};

const gridStyle = computed(() => ({ gridTemplateColumns: `repeat(${size.value}, 56px)` }));

onMounted(tick);
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <div class="slide">
    <ul class="slide__grid" :style="gridStyle" aria-label="Плитки головоломки">
      <li v-for="(value, index) in tiles" :key="index">
        <button
          v-if="value !== 0"
          type="button"
          class="slide__tile"
          :aria-label="`Плитка ${value}`"
          @click="move(index)"
        >
          {{ value }}
        </button>
        <span v-else class="slide__blank" aria-hidden="true" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.slide {
  position: absolute;
  inset: 72px 8px;
  display: grid;
  place-items: center;
  overflow-y: auto;
}

.slide__grid {
  display: grid;
  gap: 4px;
  padding: 6px;
  margin: 0;
  list-style: none;
}

.slide__tile,
.slide__blank {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
}

.slide__tile {
  font-size: 16px;
  color: var(--ink);
  cursor: pointer;
  background: var(--gold);
  border: 3px solid var(--ink);
  box-shadow: inset 0 0 0 2px var(--edge);
}

.slide__tile:hover,
.slide__tile:focus-visible {
  background: var(--panel-light);
  color: var(--gold);
  outline: none;
}

.slide__blank {
  background: repeating-linear-gradient(45deg, var(--panel-light) 0 6px, var(--panel) 6px 12px);
  border: 3px solid var(--ink);
}

/* Телефон: сверху полоса мини-игры в две строки. */
@media (width <= 600px) {
  .slide {
    inset: 96px 8px 8px;
  }
}
</style>
