<script setup lang="ts">
defineProps<{ savedAt: number }>();
</script>

<template>
  <li :key="savedAt" class="pixel-panel save-indicator" aria-live="polite">Сохранено</li>
</template>

<style scoped>
.save-indicator {
  padding: 10px 12px;
  color: var(--green);
  animation: save-indicator-fade 1.8s ease-out forwards;
}

@keyframes save-indicator-fade {
  0%,
  55% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}
</style>
