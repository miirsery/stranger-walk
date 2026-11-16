<script setup lang="ts">
import { crashMessage } from '../crash';

// Полная перезагрузка, а не программная навигация: часть состояния (например, Phaser) могла сломаться.
const reload = (): void => location.reload();
const toMenu = (): void => {
  location.hash = '/';
  location.reload();
};
</script>

<template>
  <div class="crash" role="alert">
    <div class="pixel-panel crash__box">
      <h2 class="crash__title">Что-то пошло не так</h2>
      <p class="crash__text">
        Игра столкнулась с ошибкой. Прогресс сохраняется автоматически — можно продолжить с последнего сохранения.
      </p>
      <button type="button" class="pixel-button" autofocus @click="reload">Продолжить</button>
      <button type="button" class="pixel-button pixel-button--ghost" @click="toMenu">В главное меню</button>
      <details v-if="crashMessage" class="crash__details">
        <summary>Подробности</summary>
        <p>{{ crashMessage }}</p>
      </details>
    </div>
  </div>
</template>

<style scoped>
.crash {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  padding: 16px;
  background: var(--ink);
  place-items: center;
}

.crash__box {
  display: grid;
  gap: 16px;
  width: min(100%, 360px);
  padding: 24px;
  text-align: center;
}

.crash__title {
  font-size: 18px;
  color: var(--gold);
}

.crash__text {
  font-size: 9px;
  line-height: 1.8;
  color: var(--muted);
}

.crash__details {
  font-size: 8px;
  color: var(--muted);
  text-align: left;
}

.crash__details summary {
  cursor: pointer;
}
</style>
