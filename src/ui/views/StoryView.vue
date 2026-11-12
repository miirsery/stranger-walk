<script setup lang="ts">
import { gameContent } from '@content/index';
import PageLayout from '../components/PageLayout.vue';

const chapters = gameContent.story;
</script>

<template>
  <PageLayout title="Сюжет">
    <article v-for="chapter in chapters" :key="chapter.title" class="pixel-panel chapter">
      <h2 class="chapter__title">{{ chapter.title }}</h2>
      <p>{{ chapter.text }}</p>
    </article>
  </PageLayout>
</template>

<style scoped>
.chapter {
  display: grid;
  gap: 12px;
}

.chapter__title {
  font-size: 13px;
  color: var(--gold);
}
</style>
