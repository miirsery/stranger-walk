<script setup lang="ts">
import type { GameSession } from '@core/session/gameSession';
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{ session: GameSession }>();

const name = ref('');
const instructions = ref('');
const score = ref(0);
const target = ref(0);
const misses = ref(0);
const maxMisses = ref(0);
const seconds = ref(0);

let frame = 0;

// Состояние мини-игры меняется каждый кадр — читаем его в ритме отрисовки, а не событиями.
const tick = (): void => {
  const mode = props.session.mode;
  if (mode.kind === 'minigame') {
    name.value = mode.def.name;
    instructions.value = mode.def.instructions;
    score.value = mode.game.score;
    target.value = mode.def.targetScore;
    misses.value = mode.game.misses;
    maxMisses.value = mode.def.maxMisses;
    seconds.value = Math.ceil(mode.game.timeLeftMs / 1000);
  }
  frame = requestAnimationFrame(tick);
};

onMounted(tick);
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <div class="minigame">
    <div class="minigame__bar pixel-panel">
      <span class="minigame__name">{{ name }}</span>
      <span>Счёт {{ score }}/{{ target }}</span>
      <span class="minigame__misses">Промахи {{ misses }}/{{ maxMisses }}</span>
      <span>Время {{ seconds }}</span>
    </div>
    <p class="minigame__help pixel-panel">{{ instructions }}</p>
  </div>
</template>

<style scoped>
.minigame {
  position: absolute;
  inset: 12px 72px 12px 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  font-size: 9px;
  pointer-events: none;
}

.minigame__bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  justify-content: center;
  padding: 12px;
}

.minigame__name {
  color: var(--gold);
}

.minigame__misses {
  color: var(--red);
}

.minigame__help {
  padding: 10px 12px;
  margin-bottom: 96px;
  color: var(--muted);
  text-align: center;
}
</style>
