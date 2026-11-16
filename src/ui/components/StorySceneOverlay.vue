<script setup lang="ts">
defineProps<{ title: string; text: string }>();
defineEmits<{ close: [] }>();
</script>

<template>
  <button type="button" class="scene pixel-panel" :aria-label="title" @click="$emit('close')">
    <span class="scene__title">{{ title }}</span>
    <span class="scene__text">{{ text }}</span>
    <span class="scene__next" aria-hidden="true">■</span>
  </button>
</template>

<style scoped>
.scene {
  position: absolute;
  right: 12px;
  bottom: max(12px, env(safe-area-inset-bottom));
  left: 12px;
  display: grid;
  gap: 10px;
  max-width: 720px;
  min-height: 96px;
  margin: 0 auto;
  text-align: left;
  cursor: pointer;
}

.scene__title {
  font-size: 11px;
  color: var(--gold);
}

.scene__text {
  font-size: 10px;
  line-height: 1.8;
}

.scene__next {
  justify-self: end;
  color: var(--gold);
}
</style>
