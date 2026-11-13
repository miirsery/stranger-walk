<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { isDebugEnabled } from '@/platform/debugMode';
import { localSaveStorage } from '@/platform/saveStorage';
import BattleOverlay from '../components/BattleOverlay.vue';
import DebugPanel from '../components/DebugPanel.vue';
import DeckOverlay from '../components/DeckOverlay.vue';
import DialogBox from '../components/DialogBox.vue';
import GameHud from '../components/GameHud.vue';
import GameLoader from '../components/GameLoader.vue';
import JournalOverlay from '../components/JournalOverlay.vue';
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
const debug = isDebugEnabled();
const { session, input, modeKind, minigameType, minigamePhase, loading, levelName, dialog, battle, quests, cardTotal, deckSize, toasts, paused, panel, interactTarget } = game;
const settings = useSettingsStore();

const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
const showTouch = computed(
  () =>
    // Джойстик нужен только там, где есть движение: в мире и в идущей мини-игре с полем.
    (modeKind.value === 'world' || (minigameType.value === 'catch' && minigamePhase.value === 'playing')) &&
    !loading.value &&
    !paused.value &&
    panel.value === null &&
    (settings.touchControls === 'on' || (settings.touchControls === 'auto' && coarsePointer)),
);

const onKeyDown = (event: KeyboardEvent): void => {
  if (loading.value) return;
  if (event.code === 'Escape') {
    if (panel.value) game.setPanel(null);
    else game.setPaused(!paused.value);
  } else if (event.code === 'KeyC' && !event.repeat) {
    game.setPanel(panel.value === 'deck' ? null : 'deck');
  } else if (event.code === 'KeyJ' && !event.repeat) {
    game.setPanel(panel.value === 'journal' ? null : 'journal');
  }
};

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  // После старта новая игра уже сохранена: перезагрузка страницы должна её продолжить.
  if (route.query.continue !== '1') void router.replace({ query: { ...route.query, continue: '1' } });
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));
</script>

<template>
  <main class="game">
    <div ref="container" class="game__canvas" />

    <!-- Весь интерфейс поверх канваса: масштабируется настройкой «Размер интерфейса». -->
    <div class="game__ui ui-scale" :class="{ 'game__ui--touch': showTouch }">
      <GameHud
        v-if="modeKind === 'world' || modeKind === 'dialog'"
        :level-name="levelName"
        :quests="quests"
        :card-total="cardTotal"
        :deck-size="deckSize"
        @open-deck="game.setPanel('deck')"
        @open-journal="game.setPanel('journal')"
      />
      <MemoryBoard v-if="minigameType === 'memory' && minigamePhase !== 'intro'" :session="session" />
      <MinigameHud v-if="minigamePhase" :session="session" :phase="minigamePhase" />
      <BattleOverlay v-if="battle" :session="session" :state="battle" />
      <TouchControls v-if="showTouch" :input="input" />
      <p v-if="interactTarget && !paused && !panel" class="pixel-panel game__hint">
        <kbd>{{ showTouch ? 'A' : 'E' }}</kbd> <span class="game__hint-verb">поговорить:</span> {{ interactTarget }}
      </p>
      <DialogBox v-if="dialog" :dialog="dialog" @next="session.interact()" />

      <ul class="game__toasts" aria-live="polite">
        <li v-for="toast in toasts" :key="toast.id" class="pixel-panel game__toast">{{ toast.text }}</li>
      </ul>

      <DeckOverlay v-if="panel === 'deck'" :session="session" @close="game.setPanel(null)" @changed="game.refresh()" />
      <JournalOverlay v-if="panel === 'journal'" :session="session" :quests="quests" @close="game.setPanel(null)" />

      <button
        v-if="!paused && !panel"
        type="button"
        class="pixel-button pixel-button--ghost game__pause"
        aria-label="Пауза"
        @click="game.setPaused(true)"
      >
        II
      </button>
      <DebugPanel v-if="debug && !paused && !panel" :session="session" :mode-kind="modeKind" @changed="game.refresh()" />
      <PauseMenu v-if="paused" @resume="game.setPaused(false)" />

      <Transition name="loader">
        <GameLoader v-if="loading" />
      </Transition>
    </div>
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

.game__ui {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.loader-leave-active {
  transition: opacity 0.3s steps(4);
}

.loader-leave-to {
  opacity: 0;
}

.game__toasts {
  position: absolute;
  top: 68px;
  /* Правая колонка занята кнопками паузы и отладки. */
  right: 76px;
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

/* Телефон: уведомления идут отдельной строкой под верхней панелью, по центру. */
@media (width <= 600px) {
  .game__toasts {
    top: 116px;
    right: 12px;
    left: 12px;
    justify-items: center;
    max-width: none;
  }

  .game__hint-verb {
    display: none;
  }

  /* В портрете низ экрана занят джойстиком и «A» — подсказка поднимается над ними. */
  .game__ui--touch .game__hint {
    bottom: calc(max(16px, env(safe-area-inset-bottom)) + 148px);
  }

  .game__hint {
    max-width: calc(100% - 24px);
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
