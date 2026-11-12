<script setup lang="ts">
import { RouterLink } from 'vue-router';

defineProps<{ title: string }>();
</script>

<template>
  <main class="page">
    <div class="page__inner">
      <header class="page__header">
        <RouterLink class="pixel-button pixel-button--ghost" to="/">← Меню</RouterLink>
        <h1 class="page__title">{{ title }}</h1>
      </header>
      <div class="page__content">
        <slot />
      </div>
    </div>
  </main>
</template>

<style scoped>
.page {
  height: 100%;
  overflow-y: auto;
  padding: 24px 16px 48px;
  background:
    linear-gradient(rgb(20 18 31 / 0%) 60%, var(--ink)),
    repeating-linear-gradient(0deg, var(--night) 0 4px, #211e35 4px 8px);
}

.page__inner {
  max-width: 760px;
  margin: 0 auto;
}

.page__header {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
}

.page__title {
  font-size: 18px;
  color: var(--gold);
  text-shadow: 3px 3px 0 var(--ink);
}

.page__content {
  display: grid;
  gap: 20px;
}
</style>
