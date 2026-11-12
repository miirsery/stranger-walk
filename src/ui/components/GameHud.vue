<script setup lang="ts">
import type { QuestView } from '@core/quests/questLog';
import { computed } from 'vue';

const props = defineProps<{
  levelName: string;
  quests: QuestView[];
  cardTotal: number;
  deckSize: number;
}>();

const active = computed(() => props.quests.filter((quest) => quest.status === 'active'));
const completed = computed(() => props.quests.filter((quest) => quest.status === 'completed').length);
</script>

<template>
  <div class="hud">
    <section class="hud__quests pixel-panel" aria-label="Задания">
      <p class="hud__level">{{ levelName }}</p>
      <p v-if="quests.length === 0" class="hud__empty">Заданий пока нет. Поговори с кем-нибудь.</p>
      <div v-for="quest in active" :key="quest.def.id" class="hud__quest">
        <h2 class="hud__quest-title">{{ quest.def.title }}</h2>
        <ul class="hud__objectives">
          <li
            v-for="objective in quest.objectives"
            :key="objective.def.id"
            :class="{ 'hud__objective--done': objective.done }"
          >
            <span aria-hidden="true">{{ objective.done ? '■' : '□' }}</span>
            {{ objective.def.text }}
          </li>
        </ul>
      </div>
      <p v-if="completed > 0" class="hud__empty">Выполнено квестов: {{ completed }}</p>
    </section>
    <section class="hud__cards pixel-panel" aria-label="Карты">
      <span class="hud__cards-icon" aria-hidden="true" />
      <span>{{ cardTotal }}</span>
      <span class="hud__deck">колода {{ deckSize }}</span>
    </section>
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
  background: rgb(42 37 64 / 88%);
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

.hud__objectives {
  display: grid;
  gap: 4px;
  padding: 0;
  margin: 4px 0 0;
  list-style: none;
}

.hud__objective--done {
  color: var(--green);
}

.hud__cards {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px;
  background: rgb(42 37 64 / 88%);
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
