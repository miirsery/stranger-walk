<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import BattleOverlay from '../components/BattleOverlay.vue';
import DialogBox from '../components/DialogBox.vue';
import GameHud from '../components/GameHud.vue';
import MinigameHud from '../components/MinigameHud.vue';
import PauseMenu from '../components/PauseMenu.vue';
import TouchControls from '../components/TouchControls.vue';
import { useGame } from '../composables/useGame';
import { useSettingsStore } from '../stores/settings';

const container = ref<HTMLElement | null>(null);
const game = useGame(container);
const { session, input, modeKind, levelName, dialog, battle, quests, cardTotal, deckSize, toasts, paused } = game;
const settings = useSettingsStore();

const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
const showTouch = computed(
  () =>
    modeKind.value !== 'battle' &&
    !paused.value &&
    (settings.touchControls === 'on' || (settings.touchControls === 'auto' && coarsePointer)),
);

const onKeyDown = (event: KeyboardEvent): void => {
  if (event.code === 'Escape') game.setPaused(!paused.value);
};

onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));
</script>

<template>
  <main class="game">
    <div ref="container" class="game__canvas" />

    <GameHud
      v-if="modeKind === 'world' || modeKind === 'dialog'"
      :level-name="levelName"
      :quests="quests"
      :card-total="cardTotal"
      :deck-size="deckSize"
    />
    <MinigameHud v-if="modeKind === 'minigame'" :session="session" />
    <BattleOverlay v-if="battle" :session="session" :state="battle" />
    <TouchControls v-if="showTouch" :input="input" />
    <DialogBox v-if="dialog" :dialog="dialog" @next="session.interact()" />

    <ul class="game__toasts" aria-live="polite">
      <li v-for="toast in toasts" :key="toast.id" class="pixel-panel game__toast">{{ toast.text }}</li>
    </ul>

    <button
      v-if="!paused"
      type="button"
      class="pixel-button pixel-button--ghost game__pause"
      aria-label="Пауза"
      @click="game.setPaused(true)"
    >
      II
    </button>
    <PauseMenu v-if="paused" @resume="game.setPaused(false)" />
  </main>
</template>

<style scoped>
.game {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--ink);
}

.game__canvas {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.game__canvas :deep(canvas) {
  display: block;
  image-rendering: pixelated;
}

.game__toasts {
  position: absolute;
  top: 68px;
  right: 12px;
  display: grid;
  gap: 8px;
  justify-items: end;
  max-width: min(320px, 70vw);
  padding: 0;
  margin: 0;
  font-size: 9px;
  pointer-events: none;
  list-style: none;
}

.game__toast {
  padding: 10px 12px;
  color: var(--ink);
  background: var(--gold);
  box-shadow: 0 var(--px) 0 var(--px) rgb(0 0 0 / 35%);
}

.game__pause {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 10px 12px;
  font-size: 9px;
}
</style>
