<script setup lang="ts">
import type { CardDef } from '@core/content/types';
import type { GameSession } from '@core/session/gameSession';
import { computed, ref } from 'vue';
import CardFace from './CardFace.vue';

const props = defineProps<{ session: GameSession }>();
const emit = defineEmits<{ close: []; changed: [] }>();

interface Row {
  card: CardDef;
  owned: number;
  inDeck: number;
  tint: number;
}

// Коллекция живёт в ядре и не реактивна — после каждого изменения пересчитываем строки.
const version = ref(0);
const error = ref('');

const rules = props.session.cards.rules;

const rows = computed<Row[]>(() => {
  void version.value;
  const { cards, content } = props.session;
  return cards
    .list()
    .map(({ cardId, count }) => {
      const card = content.card(cardId);
      return {
        card,
        owned: count,
        inDeck: cards.deck.filter((id) => id === cardId).length,
        tint: content.setting(card.setting).backgroundColor,
      };
    })
    .sort((a, b) => a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name, 'ru'));
});

const deckSize = computed(() => {
  void version.value;
  return props.session.cards.deck.length;
});

const apply = (deck: string[]): void => {
  const errors = props.session.cards.setDeck(deck);
  error.value = errors[0] ?? '';
  if (errors.length === 0) {
    version.value += 1;
    emit('changed');
  }
};

const add = (cardId: string): void => apply([...props.session.cards.deck, cardId]);

const remove = (cardId: string): void => {
  const deck = [...props.session.cards.deck];
  const index = deck.lastIndexOf(cardId);
  if (index >= 0) deck.splice(index, 1);
  apply(deck);
};
</script>

<template>
  <div class="deck" role="dialog" aria-modal="true" aria-label="Колода">
    <div class="pixel-panel deck__box">
      <header class="deck__header">
        <h2 class="deck__title">Колода</h2>
        <p class="deck__size" :class="{ 'deck__size--low': deckSize < rules.minSize }">
          {{ deckSize }}/{{ rules.maxSize }} · минимум {{ rules.minSize }}
        </p>
        <button type="button" class="pixel-button" autofocus @click="emit('close')">Готово</button>
      </header>
      <p class="deck__hint">
        В бой идут только карты из колоды. Не больше {{ rules.maxCopies }} копий одной карты.
      </p>
      <p class="deck__error" aria-live="polite">{{ error }}</p>
      <ul class="deck__grid">
        <li v-for="row in rows" :key="row.card.id" class="deck__item" :class="{ 'deck__item--out': row.inDeck === 0 }">
          <CardFace :card="row.card" :tint="row.tint" />
          <p class="deck__text">{{ row.card.text }}</p>
          <div class="deck__controls">
            <button
              type="button"
              class="pixel-button pixel-button--ghost deck__step"
              :disabled="row.inDeck === 0"
              :aria-label="`Убрать из колоды: ${row.card.name}`"
              @click="remove(row.card.id)"
            >
              −
            </button>
            <span class="deck__count" :aria-label="`В колоде ${row.inDeck} из ${row.owned}`">
              {{ row.inDeck }}/{{ row.owned }}
            </span>
            <button
              type="button"
              class="pixel-button pixel-button--ghost deck__step"
              :disabled="row.inDeck >= row.owned || row.inDeck >= rules.maxCopies || deckSize >= rules.maxSize"
              :aria-label="`Добавить в колоду: ${row.card.name}`"
              @click="add(row.card.id)"
            >
              +
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.deck {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 12px;
  background: rgb(20 18 31 / 82%);
}

.deck__box {
  display: grid;
  grid-template-rows: auto auto auto 1fr;
  gap: 10px;
  width: min(100%, 860px);
  max-height: 100%;
  font-size: 9px;
}

.deck__header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.deck__title {
  font-size: 16px;
  color: var(--gold);
}

.deck__size {
  color: var(--green);
}

.deck__size--low,
.deck__error {
  color: var(--red);
}

.deck__hint {
  color: var(--muted);
}

.deck__error {
  min-height: 1.7em;
}

.deck__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: 20px 12px;
  padding: 12px 4px 4px 12px;
  margin: 0;
  overflow-y: auto;
  list-style: none;
}

.deck__item {
  display: grid;
  gap: 8px;
  justify-items: center;
}

.deck__item--out :deep(.card) {
  filter: grayscale(0.8) brightness(0.7);
}

.deck__text {
  min-height: 3.4em;
  font-size: 7px;
  color: var(--muted);
  text-align: center;
}

.deck__controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.deck__step {
  width: 32px;
  padding: 6px 0;
}
</style>
