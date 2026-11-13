<script setup lang="ts">
import type { CardDef } from '@core/content/types';
import type { QuestView } from '@core/quests/questLog';
import type { GameSession } from '@core/session/gameSession';
import { computed, ref } from 'vue';
import CardFace from './CardFace.vue';

const props = defineProps<{ session: GameSession; quests: QuestView[] }>();
defineEmits<{ close: [] }>();

type Tab = 'quests' | 'collection';
const tab = ref<Tab>('quests');

const sortedQuests = computed(() =>
  [...props.quests].sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed')),
);

interface Entry {
  card: CardDef;
  owned: number;
  tint: number;
}

interface Group {
  settingName: string;
  entries: Entry[];
}

// Вся картотека игры по мирам; ненайденные карты показываются закрытыми.
const groups = computed<Group[]>(() => {
  const { content, cards } = props.session;
  return Object.values(content.data.settings)
    .map((setting) => ({
      settingName: setting.name,
      entries: Object.values(content.data.cards)
        .filter((card) => card.setting === setting.id)
        .sort((a, b) => a.cost - b.cost)
        .map((card) => ({ card, owned: cards.count(card.id), tint: setting.backgroundColor })),
    }))
    .filter((group) => group.entries.length > 0);
});

const totalCards = computed(() => groups.value.reduce((sum, group) => sum + group.entries.length, 0));
const foundCards = computed(() =>
  groups.value.reduce((sum, group) => sum + group.entries.filter((entry) => entry.owned > 0).length, 0),
);
</script>

<template>
  <div class="journal" role="dialog" aria-modal="true" aria-label="Журнал">
    <div class="pixel-panel journal__box">
      <header class="journal__header">
        <div class="journal__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="pixel-button"
            :class="{ 'pixel-button--ghost': tab !== 'quests' }"
            :aria-selected="tab === 'quests'"
            @click="tab = 'quests'"
          >
            Квесты
          </button>
          <button
            type="button"
            role="tab"
            class="pixel-button"
            :class="{ 'pixel-button--ghost': tab !== 'collection' }"
            :aria-selected="tab === 'collection'"
            @click="tab = 'collection'"
          >
            Карты {{ foundCards }}/{{ totalCards }}
          </button>
        </div>
        <button type="button" class="pixel-button" autofocus @click="$emit('close')">Закрыть</button>
      </header>

      <div v-if="tab === 'quests'" class="journal__body" role="tabpanel">
        <p v-if="sortedQuests.length === 0" class="journal__empty">
          Заданий пока нет. Поговори со старейшиной на лугах.
        </p>
        <article v-for="quest in sortedQuests" :key="quest.def.id" class="journal__quest">
          <h2 class="journal__quest-title" :class="{ 'journal__quest-title--done': quest.status === 'completed' }">
            {{ quest.def.title }}
            <span class="journal__status">{{ quest.status === 'completed' ? 'выполнен' : 'в работе' }}</span>
          </h2>
          <p class="journal__description">{{ quest.def.description }}</p>
          <ul class="journal__objectives">
            <li
              v-for="objective in quest.objectives"
              :key="objective.def.id"
              :class="{ 'journal__objective--done': objective.done }"
            >
              <span aria-hidden="true">{{ objective.done ? '■' : '□' }}</span>
              {{ objective.def.text }}
            </li>
          </ul>
        </article>
      </div>

      <div v-else class="journal__body" role="tabpanel">
        <section v-for="group in groups" :key="group.settingName" class="journal__group">
          <h2 class="journal__group-title">{{ group.settingName }}</h2>
          <ul class="journal__cards">
            <li v-for="entry in group.entries" :key="entry.card.id" class="journal__card">
              <template v-if="entry.owned > 0">
                <CardFace :card="entry.card" :tint="entry.tint" compact />
                <span class="journal__count">×{{ entry.owned }}</span>
              </template>
              <span v-else class="journal__unknown" aria-label="Карта ещё не найдена">?</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.journal {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 12px;
  background: rgb(20 18 31 / 82%);
}

.journal__box {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 16px;
  width: min(100%, 760px);
  height: min(100%, 620px);
  font-size: 9px;
}

.journal__header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.journal__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.journal__body {
  display: grid;
  gap: 20px;
  align-content: start;
  padding-right: 4px;
  overflow-y: auto;
}

.journal__empty {
  color: var(--muted);
}

.journal__quest {
  display: grid;
  gap: 8px;
}

.journal__quest-title {
  font-size: 11px;
  color: var(--blue);
}

.journal__quest-title--done {
  color: var(--green);
}

.journal__status {
  margin-left: 8px;
  font-size: 7px;
  color: var(--muted);
}

.journal__description {
  color: var(--muted);
}

.journal__objectives {
  display: grid;
  gap: 4px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.journal__objective--done {
  color: var(--green);
}

.journal__group {
  display: grid;
  gap: 10px;
}

.journal__group-title {
  font-size: 11px;
  color: var(--gold);
}

.journal__cards {
  display: flex;
  flex-wrap: wrap;
  gap: 18px 14px;
  padding: 10px 0 0 10px;
  margin: 0;
  list-style: none;
}

.journal__card {
  position: relative;
}

.journal__count {
  position: absolute;
  right: -6px;
  bottom: -8px;
  padding: 1px 4px;
  font-size: 7px;
  color: var(--ink);
  background: var(--gold);
  border: 2px solid var(--ink);
}

.journal__unknown {
  display: grid;
  place-items: center;
  width: 76px;
  height: 104px;
  font-size: 20px;
  color: var(--edge);
  background: var(--ink);
  border: 3px dashed var(--edge);
}
</style>
