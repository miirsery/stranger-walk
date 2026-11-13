<script setup lang="ts">
import { RouterLink } from 'vue-router';

defineEmits<{ resume: [] }>();
</script>

<template>
  <div class="pause" role="dialog" aria-modal="true" aria-label="Пауза">
    <div class="pixel-panel pause__box">
      <h2 class="pause__title">Пауза</h2>
      <p class="pause__keys"><kbd>WASD</kbd> движение · <kbd>E</kbd> действие · <kbd>C</kbd> колода · <kbd>J</kbd> журнал</p>
      <button type="button" class="pixel-button" autofocus @click="$emit('resume')">Продолжить</button>
      <RouterLink class="pixel-button pixel-button--ghost" to="/">Выйти в меню</RouterLink>
      <p class="pause__note">Прогресс сохраняется автоматически — в меню можно будет нажать «Продолжить».</p>
    </div>
  </div>
</template>

<style scoped>
.pause {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgb(20 18 31 / 78%);
}

.pause__box {
  display: grid;
  gap: 16px;
  width: min(100%, 340px);
  padding: 24px;
  text-align: center;
}

.pause__title {
  font-size: 18px;
  color: var(--gold);
}

.pause__keys,
.pause__note {
  font-size: 8px;
  color: var(--muted);
}
</style>
