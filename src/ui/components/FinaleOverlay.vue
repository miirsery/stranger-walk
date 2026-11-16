<script setup lang="ts">
import { RouterLink } from 'vue-router';

defineProps<{ title: string; lines: string[] }>();
defineEmits<{ close: [] }>();
</script>

<template>
  <div class="finale" role="dialog" aria-modal="true" :aria-label="title">
    <div class="pixel-panel finale__box">
      <h2 class="finale__title">{{ title }}</h2>
      <p v-for="(line, index) in lines" :key="index" class="finale__line">{{ line }}</p>
      <button type="button" class="pixel-button" autofocus @click="$emit('close')">Продолжить</button>
      <RouterLink class="pixel-button pixel-button--ghost" to="/">В главное меню</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.finale {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgb(20 18 31 / 88%);
}

.finale__box {
  display: grid;
  gap: 14px;
  width: min(100%, 460px);
  max-height: 80%;
  padding: 24px;
  overflow-y: auto;
  text-align: center;
}

.finale__title {
  font-size: 15px;
  color: var(--gold);
}

.finale__line {
  font-size: 10px;
  line-height: 1.8;
  text-align: left;
  color: var(--muted);
}
</style>
