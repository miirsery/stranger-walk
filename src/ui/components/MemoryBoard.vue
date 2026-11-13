<script setup lang="ts">
import type { CardDef } from '@core/content/types';
import type { MemoryTile } from '@core/minigames/memoryGame';
import type { GameSession } from '@core/session/gameSession';
import { onBeforeUnmount, onMounted, shallowRef } from 'vue';
import CardFace from './CardFace.vue';

const props = defineProps<{ session: GameSession }>();

const tiles = shallowRef<MemoryTile[]>([]);
let frame = 0;
let signature = '';

// Плитки закрываются по таймеру внутри ядра, поэтому состояние читаем каждый кадр.
const tick = (): void => {
  const mode = props.session.mode;
  if (mode.kind === 'minigame' && mode.game.type === 'memory') {
    const next = mode.game.tiles.map((tile) => tile.state).join('');
    if (next !== signature) {
      signature = next;
      tiles.value = mode.game.tiles.map((tile) => ({ ...tile }));
    }
  }
  frame = requestAnimationFrame(tick);
};

const flip = (index: number): void => {
  const mode = props.session.mode;
  if (mode.kind === 'minigame' && mode.game.type === 'memory') mode.game.flip(index);
};

const card = (cardId: string): CardDef => props.session.content.card(cardId);
const tint = (cardId: string): number => props.session.content.setting(card(cardId).setting).backgroundColor;

onMounted(tick);
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <div class="memory">
    <ul class="memory__grid" aria-label="Плитки">
      <li v-for="(tile, index) in tiles" :key="index">
        <button
          type="button"
          class="memory__tile"
          :class="`memory__tile--${tile.state}`"
          :disabled="tile.state !== 'hidden'"
          :aria-label="tile.state === 'hidden' ? `Закрытая плитка ${index + 1}` : card(tile.cardId).name"
          @click="flip(index)"
        >
          <CardFace v-if="tile.state !== 'hidden'" :card="card(tile.cardId)" :tint="tint(tile.cardId)" compact />
          <span v-else class="memory__back" aria-hidden="true">?</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.memory {
  position: absolute;
  inset: 72px 8px;
  display: grid;
  place-items: center;
  overflow-y: auto;
}

.memory__grid {
  display: grid;
  grid-template-columns: repeat(4, 76px);
  gap: 10px 8px;
  padding: 6px;
  margin: 0;
  list-style: none;
}

@media (width >= 700px) {
  .memory__grid {
    grid-template-columns: repeat(6, 76px);
    gap: 14px;
    padding: 10px;
  }
}

.memory__tile {
  display: block;
  width: 76px;
  height: 104px;
  padding: 0;
  cursor: pointer;
  background: none;
  border: 0;
}

.memory__tile:disabled {
  cursor: default;
}

.memory__tile--matched {
  filter: drop-shadow(0 4px 0 var(--green));
}

.memory__tile--open {
  filter: drop-shadow(0 4px 0 var(--gold));
}

.memory__back {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  font-size: 20px;
  color: var(--gold);
  background: repeating-linear-gradient(45deg, var(--panel-light) 0 6px, var(--panel) 6px 12px);
  border: 3px solid var(--ink);
  box-shadow: inset 0 0 0 2px var(--edge);
}

.memory__tile--hidden:hover .memory__back,
.memory__tile--hidden:focus-visible .memory__back {
  box-shadow: inset 0 0 0 3px var(--gold);
}

.memory__tile:focus-visible {
  outline: none;
}
</style>
