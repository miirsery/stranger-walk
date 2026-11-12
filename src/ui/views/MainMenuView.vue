<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { gameContent } from '@content/index';
import { audio } from '@/audio/chiptune';
import { useSettingsStore } from '../stores/settings';

useSettingsStore();

const items = [
  { to: '/controls', label: 'Управление' },
  { to: '/story', label: 'Сюжет' },
  { to: '/hints', label: 'Подсказки' },
  { to: '/settings', label: 'Настройки' },
];

// Музыка меню — тема стартового мира; зазвучит после первого жеста пользователя.
onMounted(() => audio.playTrack(gameContent.music.fields ?? null));
onBeforeUnmount(() => audio.playTrack(null));
</script>

<template>
  <main class="menu">
    <div class="menu__stars" aria-hidden="true" />
    <div class="menu__box">
      <p class="menu__kicker">пиксельная карточная RPG</p>
      <h1 class="menu__title">Stranger<br />Walk</h1>
      <nav class="menu__nav" aria-label="Главное меню">
        <RouterLink class="pixel-button menu__play" to="/play">▶ Играть</RouterLink>
        <RouterLink v-for="item in items" :key="item.to" class="pixel-button pixel-button--ghost" :to="item.to">
          {{ item.label }}
        </RouterLink>
      </nav>
      <p class="menu__version">MVP 0.1 · прогресс пока не сохраняется</p>
    </div>
  </main>
</template>

<style scoped>
.menu {
  position: relative;
  display: grid;
  place-items: center;
  height: 100%;
  padding: 16px;
  overflow-y: auto;
  background: linear-gradient(#1d1a2e 0 55%, #2b2350 55% 70%, #2f6b3a 70% 100%);
}

.menu__stars {
  position: absolute;
  inset: 0 0 45%;
  background-image:
    radial-gradient(var(--text) 1px, transparent 1.5px), radial-gradient(var(--gold) 1px, transparent 1.5px);
  background-position:
    0 0,
    37px 53px;
  background-size:
    96px 96px,
    128px 128px;
  image-rendering: pixelated;
  opacity: 0.6;
}

.menu__box {
  position: relative;
  display: grid;
  gap: 20px;
  width: min(100%, 380px);
  text-align: center;
}

.menu__kicker {
  font-size: 9px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.menu__title {
  font-size: clamp(28px, 9vw, 44px);
  line-height: 1.25;
  color: var(--gold);
  text-shadow:
    4px 4px 0 var(--red),
    8px 8px 0 var(--ink);
}

.menu__nav {
  display: grid;
  gap: 12px;
  margin-top: 8px;
}

.menu__play {
  padding-block: 16px;
  font-size: 14px;
}

.menu__version {
  font-size: 8px;
  color: var(--muted);
}
</style>
