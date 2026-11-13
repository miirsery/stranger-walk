<script setup lang="ts">
import type { QuestView } from '@core/quests/questLog';
import { computed } from 'vue';

const props = defineProps<{
  levelName: string;
  quests: QuestView[];
  cardTotal: number;
  deckSize: number;
}>();

defineEmits<{ openDeck: []; openJournal: [] }>();

const active = computed(() => props.quests.filter((quest) => quest.status === 'active'));
const completed = computed(() => props.quests.filter((quest) => quest.status === 'completed').length);
</script>

<template>
  <div class="hud">
    <button
      type="button"
      class="hud__quests pixel-panel"
      aria-label="Открыть журнал заданий"
      title="Журнал (J)"
      @click="$emit('openJournal')"
    >
      <!-- Внутри кнопки допустимы только строчные элементы, поэтому span вместо p/h2/ul. -->
      <span class="hud__level">{{ levelName }}</span>
      <span v-if="quests.length === 0" class="hud__empty">Заданий пока нет. Поговори с кем-нибудь.</span>
      <span v-for="quest in active" :key="quest.def.id" class="hud__quest">
        <span class="hud__quest-title">{{ quest.def.title }}</span>
        <span
          v-for="objective in quest.objectives"
          :key="objective.def.id"
          class="hud__objective"
          :class="{ 'hud__objective--done': objective.done }"
        >
          <span aria-hidden="true">{{ objective.done ? '■' : '□' }}</span>
          {{ objective.def.text }}
        </span>
      </span>
      <span v-if="completed > 0" class="hud__empty">Выполнено квестов: {{ completed }}</span>
    </button>
    <button
      type="button"
      class="hud__cards pixel-panel"
      :aria-label="`Открыть колоду. Карт: ${cardTotal}, в колоде: ${deckSize}`"
      title="Колода (C)"
      @click="$emit('openDeck')"
    >
      <span class="hud__cards-icon" aria-hidden="true" />
      <span>{{ cardTotal }}</span>
      <span class="hud__deck">колода {{ deckSize }}</span>
    </button>
  </div>
</template>

<style scoped>
.hud {
  position: absolute;
  inset: 12px 72px auto 12px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  font-size: 9px;
  pointer-events: none;
}

.hud__quests {
  display: grid;
  gap: 8px;
  max-width: min(300px, 62vw);
  padding: 12px;
  font-size: 9px;
  line-height: 1.7;
  text-align: left;
  pointer-events: auto;
  cursor: pointer;
  background: rgb(42 37 64 / 88%);
}

.hud__quests:hover,
.hud__quests:focus-visible {
  outline: none;
  background: rgb(59 53 88 / 94%);
}

.hud__level {
  color: var(--gold);
}

.hud__empty {
  color: var(--muted);
}

.hud__quest-title {
  font-size: 9px;
  color: var(--blue);
}

.hud__quest {
  display: grid;
  gap: 4px;
}

.hud__objective {
  display: block;
}

.hud__objective--done {
  color: var(--green);
}

.hud__cards {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px;
  font-size: 9px;
  pointer-events: auto;
  cursor: pointer;
  background: rgb(42 37 64 / 88%);
}

.hud__cards:hover,
.hud__cards:focus-visible {
  outline: none;
  background: var(--panel-light);
}

.hud__cards-icon {
  width: 12px;
  height: 16px;
  background: var(--gold);
  border: 2px solid var(--ink);
  box-shadow: 3px -3px 0 -1px var(--red);
}

.hud__deck {
  color: var(--muted);
}

@media (width <= 520px) {
  .hud__deck {
    display: none;
  }
}
</style>
