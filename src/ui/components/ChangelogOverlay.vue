<script setup lang="ts">
import type { ChangelogEntry } from '../changelog';

defineProps<{ entries: ChangelogEntry[] }>();
defineEmits<{ close: [] }>();
</script>

<template>
  <div class="changelog" role="dialog" aria-modal="true" aria-label="Что нового">
    <div class="pixel-panel changelog__box">
      <h2 class="changelog__title">Что нового</h2>
      <section v-for="entry in entries" :key="entry.version" class="changelog__entry">
        <h3 class="changelog__version">Версия {{ entry.version }} — {{ entry.title }}</h3>
        <ul class="changelog__changes">
          <li v-for="change in entry.changes" :key="change">{{ change }}</li>
        </ul>
      </section>
      <button type="button" class="pixel-button" autofocus @click="$emit('close')">Понятно</button>
    </div>
  </div>
</template>

<style scoped>
.changelog {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgb(20 18 31 / 88%);
}

.changelog__box {
  display: grid;
  gap: 16px;
  width: min(100%, 480px);
  max-height: 80%;
  padding: 24px;
  overflow-y: auto;
  text-align: left;
}

.changelog__title {
  font-size: 15px;
  color: var(--gold);
  text-align: center;
}

.changelog__entry {
  display: grid;
  gap: 10px;
}

.changelog__version {
  font-size: 10px;
  color: var(--blue);
}

.changelog__changes {
  display: grid;
  gap: 6px;
  padding: 0;
  margin: 0;
  font-size: 9px;
  line-height: 1.6;
  color: var(--muted);
  list-style: none;
}

.changelog__changes li::before {
  margin-right: 6px;
  content: '•';
  color: var(--gold);
}

.changelog__box > .pixel-button {
  justify-self: center;
}
</style>
