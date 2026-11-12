<script setup lang="ts">
import type { GameSession } from '@core/session/gameSession';
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{ session: GameSession }>();

interface Stat {
  text: string;
  tone?: 'bad';
}

const name = ref('');
const instructions = ref('');
const stats = ref<Stat[]>([]);

let frame = 0;
let signature = '';

// Состояние мини-игры меняется каждый кадр — читаем его в ритме отрисовки, а не событиями.
const tick = (): void => {
  const mode = props.session.mode;
  if (mode.kind === 'minigame') {
    const game = mode.game;
    const next: Stat[] =
      game.type === 'catch'
        ? [
            { text: `Счёт ${game.score}/${game.def.targetScore}` },
            { text: `Промахи ${game.misses}/${game.def.maxMisses}`, tone: 'bad' },
            { text: `Время ${Math.ceil(game.timeLeftMs / 1000)}` },
          ]
        : [
            { text: `Пары ${game.matchedPairs}/${game.totalPairs}` },
            { text: `Ошибки ${game.mistakes}/${game.def.maxMistakes}`, tone: 'bad' },
          ];
    const nextSignature = next.map((stat) => stat.text).join('|');
    if (nextSignature !== signature) {
      signature = nextSignature;
      stats.value = next;
    }
    name.value = mode.def.name;
    instructions.value = mode.def.instructions;
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
      <span v-for="stat in stats" :key="stat.text" :class="{ 'minigame__bad': stat.tone === 'bad' }">{{ stat.text }}</span>
    </div>
    <p class="minigame__help pixel-panel">{{ instructions }}</p>
  </div>
</template>

<style scoped>
.minigame {
  position: absolute;
  inset: 12px 72px;
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

.minigame__bad {
  color: var(--red);
}

.minigame__help {
  padding: 10px 12px;
  color: var(--muted);
  text-align: center;
}
</style>
