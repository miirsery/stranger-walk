<script setup lang="ts">
import type { DialogState } from '@core/session/gameSession';
import { computed } from 'vue';

const props = defineProps<{ dialog: DialogState; revealedText: string; fullyRevealed: boolean }>();
const emit = defineEmits<{ next: []; choose: [index: number]; reveal: [] }>();

/** Варианты ответа показываются только на последней реплике сценария и после полного показа текста. */
const choices = computed(() => {
  if (props.dialog.index < props.dialog.lines.length - 1 || !props.fullyRevealed) return null;
  return props.dialog.choices;
});

/** Пока реплика ещё «печатается» — клик доигрывает её целиком, а не продвигает диалог. */
const handleAdvance = (): void => {
  if (props.fullyRevealed) emit('next');
  else emit('reveal');
};
</script>

<template>
  <div v-if="choices" class="dialog pixel-panel">
    <span v-if="dialog.speaker" class="dialog__speaker">{{ dialog.speaker }}</span>
    <span class="dialog__text">{{ revealedText }}</span>
    <div class="dialog__options">
      <button
        v-for="(text, index) in choices"
        :key="text"
        type="button"
        class="pixel-button pixel-button--ghost dialog__option"
        @click="$emit('choose', index)"
      >
        {{ text }}
      </button>
    </div>
  </div>
  <button v-else type="button" class="dialog pixel-panel" @click="handleAdvance">
    <span v-if="dialog.speaker" class="dialog__speaker">{{ dialog.speaker }}</span>
    <span class="dialog__text" aria-live="polite">{{ revealedText }}</span>
    <span class="dialog__next" aria-hidden="true">
      {{ !fullyRevealed ? '»' : dialog.index < dialog.lines.length - 1 ? '▼' : '■' }}
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

.dialog__options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.dialog__option {
  font-size: 10px;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
