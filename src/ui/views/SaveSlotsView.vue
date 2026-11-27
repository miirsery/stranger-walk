<script setup lang="ts">
import type { SaveData } from '@core/session/save';
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { gameContent } from '@content/index';
import PageLayout from '../components/PageLayout.vue';
import { localSaveStorage, SAVE_SLOT_COUNT } from '@/platform/saveStorage';

interface SlotView {
  index: number;
  save: SaveData | null;
}

// Слоты независимы — у каждого своё сохранение, можно вести несколько прохождений параллельно.
const slots = ref<SlotView[]>(
  Array.from({ length: SAVE_SLOT_COUNT }, (_, index) => ({ index, save: localSaveStorage.load(index) })),
);
// Слот, для которого только что нажали «Удалить» — второе нажатие подтверждает стирание.
const confirmingClear = ref<number | null>(null);

const levelName = (save: SaveData): string => gameContent.levels[save.levelId]?.name ?? save.levelId;
const cardTotal = (save: SaveData): number => Object.values(save.cards.owned).reduce((sum, count) => sum + count, 0);
const savedAtLabel = (save: SaveData): string => (save.savedAt > 0 ? new Date(save.savedAt).toLocaleString() : '');

const clearSlot = (index: number): void => {
  if (confirmingClear.value !== index) {
    confirmingClear.value = index;
    return;
  }
  localSaveStorage.clear(index);
  slots.value = slots.value.map((slot) => (slot.index === index ? { index, save: null } : slot));
  confirmingClear.value = null;
};

const playQuery = (index: number): Record<string, string> => ({ continue: '1', slot: String(index) });
const newGameQuery = (index: number): Record<string, string> => ({ slot: String(index) });
</script>

<template>
  <PageLayout title="Сохранения">
    <section v-for="slot in slots" :key="slot.index" class="pixel-panel slot">
      <template v-if="slot.save">
        <div class="slot__info">
          <h2 class="slot__title">
            Слот {{ slot.index + 1 }}
            <span v-if="slot.save.newGamePlus > 0" class="slot__cycle">New Game+{{ slot.save.newGamePlus }}</span>
          </h2>
          <p class="slot__detail">{{ levelName(slot.save) }} · карт {{ cardTotal(slot.save) }}</p>
          <p class="slot__detail slot__detail--muted">{{ savedAtLabel(slot.save) }}</p>
        </div>
        <div class="slot__actions">
          <RouterLink class="pixel-button" :to="{ path: '/play', query: playQuery(slot.index) }">Продолжить</RouterLink>
          <button
            type="button"
            class="pixel-button"
            :class="confirmingClear === slot.index ? 'pixel-button--danger' : 'pixel-button--ghost'"
            @click="clearSlot(slot.index)"
          >
            {{ confirmingClear === slot.index ? 'Точно стереть?' : 'Удалить' }}
          </button>
        </div>
      </template>
      <template v-else>
        <div class="slot__info">
          <h2 class="slot__title">Слот {{ slot.index + 1 }}</h2>
          <p class="slot__detail slot__detail--muted">Пусто</p>
        </div>
        <div class="slot__actions">
          <RouterLink class="pixel-button" :to="{ path: '/new-game', query: newGameQuery(slot.index) }">Начать игру</RouterLink>
        </div>
      </template>
    </section>
  </PageLayout>
</template>

<style scoped>
.slot {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.slot__info {
  display: grid;
  gap: 4px;
  min-width: 200px;
}

.slot__title {
  display: flex;
  gap: 10px;
  align-items: baseline;
  font-size: 12px;
  color: var(--gold);
}

.slot__cycle {
  font-size: 8px;
  color: var(--blue);
}

.slot__detail {
  font-size: 9px;
}

.slot__detail--muted {
  color: var(--muted);
}

.slot__actions {
  display: flex;
  gap: 10px;
}
</style>
