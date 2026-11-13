<script setup lang="ts">
import type { GameSession, Mode } from '@core/session/gameSession';
import { computed, ref } from 'vue';

const props = defineProps<{ session: GameSession; modeKind: Mode['kind'] }>();
const emit = defineEmits<{ changed: [] }>();

const open = ref(false);
const portalsOpen = ref(props.session.cheatPortalsOpen);
const levels = computed(() => Object.values(props.session.content.data.levels));

/** Выполняет команду и просит игру перечитать состояние сессии. */
const run = (command: () => void): void => {
  command();
  emit('changed');
};

const togglePortals = (): void => {
  portalsOpen.value = !portalsOpen.value;
  props.session.cheatSetPortalsOpen(portalsOpen.value);
};
</script>

<template>
  <div class="debug">
    <button
      type="button"
      class="pixel-button debug__toggle"
      :aria-expanded="open"
      aria-controls="debug-panel"
      title="Режим отладки"
      @click="open = !open"
    >
      DBG
    </button>
    <div v-if="open" id="debug-panel" class="pixel-panel debug__panel">
      <p class="debug__title">Отладка</p>
      <button
        type="button"
        class="pixel-button debug__button"
        :disabled="modeKind !== 'minigame'"
        @click="run(() => session.cheatWinMinigame())"
      >
        Выиграть мини-игру
      </button>
      <button
        type="button"
        class="pixel-button debug__button"
        :disabled="modeKind !== 'battle'"
        @click="run(() => session.cheatWinBattle())"
      >
        Выиграть бой
      </button>
      <button type="button" class="pixel-button debug__button" @click="run(() => session.cheatCompleteQuests())">
        Завершить квесты
      </button>
      <button type="button" class="pixel-button debug__button" @click="run(() => session.cheatGrantAllCards())">
        Все карты
      </button>
      <button type="button" class="pixel-button debug__button" :aria-pressed="portalsOpen" @click="togglePortals">
        Порталы: {{ portalsOpen ? 'открыты' : 'по правилам' }}
      </button>
      <p class="debug__title">Телепорт</p>
      <button
        v-for="level in levels"
        :key="level.id"
        type="button"
        class="pixel-button pixel-button--ghost debug__button"
        :disabled="modeKind !== 'world'"
        @click="run(() => session.cheatTeleport(level.id))"
      >
        {{ level.name }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.debug {
  position: absolute;
  top: 60px;
  right: 12px;
  z-index: 5;
  display: grid;
  gap: 8px;
  justify-items: end;
  font-size: 8px;
}

.debug__toggle {
  padding: 6px 8px;
  font-size: 8px;
  color: var(--text);
  background: #7a4fb5;
  opacity: 0.85;
}

.debug__toggle:hover,
.debug__toggle:focus-visible {
  background: #9a6fd5;
  opacity: 1;
}

.debug__panel {
  display: grid;
  gap: 6px;
  width: 200px;
  max-height: 70vh;
  padding: 10px;
  overflow-y: auto;
}

.debug__title {
  color: var(--gold);
}

.debug__button {
  padding: 6px 8px;
  font-size: 8px;
  text-align: left;
}
</style>
