<script setup lang="ts">
import type { MinigamePhase, GameSession } from '@core/session/gameSession';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{ session: GameSession; phase: MinigamePhase }>();

interface Stat {
  text: string;
  tone?: 'bad';
}

const stats = ref<Stat[]>([]);
let frame = 0;
let signature = '';

/** Сведения о мини-игре на текущий момент; пересчитываются при смене фазы. */
const info = computed(() => {
  // Зависимость от фазы: сам объект режима в ядре не реактивен.
  void props.phase;
  const mode = props.session.mode;
  if (mode.kind !== 'minigame') return null;
  return {
    name: mode.def.name,
    instructions: mode.def.instructions,
    wonBefore: mode.wonBefore,
    won: mode.game.status === 'won',
    rewards: mode.def.rewardCards.map((cardId) => props.session.content.card(cardId).name),
  };
});

// Счёт и таймер меняются каждый кадр — читаем их в ритме отрисовки, а не событиями.
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
  }
  frame = requestAnimationFrame(tick);
};

onMounted(tick);
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <div v-if="info" class="minigame">
    <div class="minigame__bar pixel-panel">
      <span class="minigame__name">{{ info.name }}</span>
      <span v-for="stat in stats" :key="stat.text" :class="{ 'minigame__bad': stat.tone === 'bad' }">{{ stat.text }}</span>
      <span v-if="phase === 'playing'" class="minigame__buttons">
        <button type="button" class="pixel-button pixel-button--ghost minigame__small" @click="session.restartMinigame()">
          Заново
        </button>
        <button type="button" class="pixel-button pixel-button--ghost minigame__small" @click="session.quitMinigame()">
          Выйти
        </button>
      </span>
    </div>

    <div v-if="phase === 'intro'" class="minigame__overlay" role="dialog" aria-modal="true" :aria-label="info.name">
      <div class="pixel-panel minigame__box">
        <h2 class="minigame__title">{{ info.name }}</h2>
        <p>{{ info.instructions }}</p>
        <p v-if="info.wonBefore" class="minigame__note">
          Ты уже прошёл эту мини-игру, награда получена. Можно сыграть ещё раз просто так — или выйти.
        </p>
        <p v-else-if="info.rewards.length" class="minigame__note">Награда за победу: {{ info.rewards.join(', ') }}.</p>
        <div class="minigame__actions">
          <button type="button" class="pixel-button" autofocus @click="session.startMinigame()">
            {{ info.wonBefore ? 'Сыграть ещё раз' : 'Начать' }}
          </button>
          <button type="button" class="pixel-button pixel-button--ghost" @click="session.quitMinigame()">Выйти</button>
        </div>
      </div>
    </div>

    <div v-if="phase === 'finished'" class="minigame__overlay" role="dialog" aria-modal="true" aria-label="Итог мини-игры">
      <div class="pixel-panel minigame__box">
        <h2 class="minigame__title" :class="info.won ? 'minigame__title--won' : 'minigame__title--lost'">
          {{ info.won ? 'Победа!' : 'Не вышло' }}
        </h2>
        <p v-if="info.won && !info.wonBefore && info.rewards.length">Получены карты: {{ info.rewards.join(', ') }}.</p>
        <p v-else-if="info.won">Отличная игра!</p>
        <p v-else>Попробуй ещё раз — или вернись позже.</p>
        <div class="minigame__actions">
          <button v-if="info.won" type="button" class="pixel-button" autofocus @click="session.quitMinigame()">
            Продолжить
          </button>
          <button
            type="button"
            class="pixel-button"
            :class="{ 'pixel-button--ghost': info.won }"
            :autofocus="!info.won"
            @click="session.restartMinigame()"
          >
            {{ info.won ? 'Сыграть ещё' : 'Заново' }}
          </button>
          <button v-if="!info.won" type="button" class="pixel-button pixel-button--ghost" @click="session.quitMinigame()">
            Выйти
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.minigame {
  position: absolute;
  inset: 0;
  font-size: 9px;
  pointer-events: none;
}

.minigame__bar {
  position: absolute;
  top: 12px;
  left: 50%;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
  justify-content: center;
  width: max-content;
  max-width: calc(100% - 144px);
  padding: 10px 12px;
  transform: translateX(-50%);
}

.minigame__name {
  color: var(--gold);
}

.minigame__bad {
  color: var(--red);
}

.minigame__buttons {
  display: flex;
  gap: 8px;
  pointer-events: auto;
}

.minigame__small {
  padding: 6px 10px;
  font-size: 8px;
}

.minigame__overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  pointer-events: auto;
  background: rgb(20 18 31 / 78%);
}

.minigame__box {
  display: grid;
  gap: 14px;
  width: min(100%, 420px);
  padding: 24px;
  font-size: 10px;
  text-align: center;
}

.minigame__title {
  font-size: 16px;
  color: var(--gold);
}

.minigame__title--won {
  color: var(--green);
}

.minigame__title--lost {
  color: var(--red);
}

.minigame__note {
  font-size: 9px;
  color: var(--muted);
}

.minigame__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

/* Телефон: полоса на всю ширину слева от кнопки паузы. */
@media (width <= 600px) {
  .minigame__bar {
    left: 12px;
    justify-content: flex-start;
    width: auto;
    max-width: calc(100% - 80px);
    transform: none;
  }
}
</style>
