<script setup lang="ts">
import type { DialogState } from '@core/session/gameSession';

defineProps<{ dialog: DialogState }>();
defineEmits<{ next: [] }>();
</script>

<template>
  <button type="button" class="dialog pixel-panel" @click="$emit('next')">
    <span v-if="dialog.speaker" class="dialog__speaker">{{ dialog.speaker }}</span>
    <span class="dialog__text" aria-live="polite">{{ dialog.lines[dialog.index] }}</span>
    <span class="dialog__next" aria-hidden="true">
      {{ dialog.index < dialog.lines.length - 1 ? '▼' : '■' }}
    </span>
  </button>
</template>

<style scoped>
.dialog {
  position: absolute;
  right: 12px;
  bottom: max(12px, env(safe-area-inset-bottom));
  left: 12px;
  display: grid;
  gap: 10px;
  max-width: 720px;
  min-height: 96px;
  margin: 0 auto;
  font-size: 11px;
  line-height: 1.8;
  text-align: left;
  cursor: pointer;
}

.dialog__speaker {
  color: var(--gold);
}

.dialog__next {
  justify-self: end;
  color: var(--gold);
  animation: blink 0.8s steps(2) infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
