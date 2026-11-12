<script setup lang="ts">
import { gameContent } from '@content/index';
import PageLayout from '../components/PageLayout.vue';

const hints = gameContent.hints;
</script>

<template>
  <PageLayout title="Подсказки">
    <ul class="hints">
      <li v-for="hint in hints" :key="hint.title" class="pixel-panel hints__item">
        <h2 class="hints__title">{{ hint.title }}</h2>
        <p>{{ hint.text }}</p>
      </li>
    </ul>
  </PageLayout>
</template>

<style scoped>
.hints {
  display: grid;
  gap: 16px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.hints__item {
  display: grid;
  gap: 10px;
}

.hints__title {
  font-size: 12px;
  color: var(--green);
}
</style>
