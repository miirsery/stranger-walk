<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { localSaveStorage } from '@/platform/saveStorage';
import BattleOverlay from '../components/BattleOverlay.vue';
import DeckOverlay from '../components/DeckOverlay.vue';
import DialogBox from '../components/DialogBox.vue';
import GameHud from '../components/GameHud.vue';
import MemoryBoard from '../components/MemoryBoard.vue';
import MinigameHud from '../components/MinigameHud.vue';
import PauseMenu from '../components/PauseMenu.vue';
import TouchControls from '../components/TouchControls.vue';
import { useGame } from '../composables/useGame';
import { useSettingsStore } from '../stores/settings';

const container = ref<HTMLElement | null>(null);
const route = useRoute();
const router = useRouter();
const game = useGame(container, { storage: localSaveStorage, continueGame: route.query.continue === '1' });
const { session, input, modeKind, minigameType, levelName, dialog, battle, quests, cardTotal, deckSize, toasts, paused, deckOpen, interactTarget } = game;
const settings = useSettingsStore();

const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
const showTouch = computed(
  () =>
    modeKind.value !== 'battle' &&
    minigameType.value !== 'memory' &&
    !paused.value &&
    !deckOpen.value &&
    (settings.touchControls === 'on' || (settings.touchControls === 'auto' && coarsePointer)),
);

const onKeyDown = (event: KeyboardEvent): void => {
  if (event.code === 'Escape') {
    if (deckOpen.value) game.setDeckOpen(false);
    else game.setPaused(!paused.value);
  } else if (event.code === 'KeyC' && !event.repeat) {
    game.setDeckOpen(!deckOpen.value);
  }
};

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  // После старта новая игра уже сохранена: перезагрузка страницы должна её продолжить.
  if (route.query.continue !== '1') void router.replace({ query: { continue: '1' } });
});
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
      @open-deck="game.setDeckOpen(true)"
    />
    <MinigameHud v-if="modeKind === 'minigame'" :session="session" />
    <MemoryBoard v-if="minigameType === 'memory'" :session="session" />
    <BattleOverlay v-if="battle" :session="session" :state="battle" />
    <TouchControls v-if="showTouch" :input="input" />
    <p v-if="interactTarget && !paused && !deckOpen" class="pixel-panel game__hint">
      <kbd>{{ showTouch ? 'A' : 'E' }}</kbd> поговорить: {{ interactTarget }}
    </p>
    <DialogBox v-if="dialog" :dialog="dialog" @next="session.interact()" />

    <ul class="game__toasts" aria-live="polite">
      <li v-for="toast in toasts" :key="toast.id" class="pixel-panel game__toast">{{ toast.text }}</li>
    </ul>

    <DeckOverlay v-if="deckOpen" :session="session" @close="game.setDeckOpen(false)" @changed="game.refresh()" />

    <button
      v-if="!paused && !deckOpen"
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

.game__hint {
  position: absolute;
  bottom: max(20px, env(safe-area-inset-bottom));
  left: 50%;
  padding: 10px 14px;
  font-size: 9px;
  white-space: nowrap;
  pointer-events: none;
  background: rgb(42 37 64 / 92%);
  transform: translateX(-50%);
}

.game__pause {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 10px 12px;
  font-size: 9px;
}
</style>
