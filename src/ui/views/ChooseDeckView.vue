<script setup lang="ts">
import type { CardDef } from '@core/content/types';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { gameContent } from '@content/index';
import CardFace from '../components/CardFace.vue';

const route = useRoute();
const router = useRouter();

interface DeckPreview {
  id: string;
  name: string;
  description: string;
  cards: CardDef[];
}

const isCardDef = (card: CardDef | undefined): card is CardDef => card !== undefined;

const decks = computed<DeckPreview[]>(() =>
  gameContent.starterDecks.map((deck) => ({
    id: deck.id,
    name: deck.name,
    description: deck.description,
    cards: [...new Set(deck.cards)].map((cardId) => gameContent.cards[cardId]).filter(isCardDef),
  })),
);

const tintFor = (card: CardDef): number => gameContent.settings[card.setting]?.backgroundColor ?? 0;

const pick = (deckId: string): void => {
  const slot = typeof route.query.slot === 'string' ? route.query.slot : '0';
  void router.push({ path: '/play', query: { deck: deckId, slot } });
};
</script>

<template>
  <main class="choose ui-scale">
    <div class="choose__box">
      <h1 class="choose__title">Выбери колоду</h1>
      <p class="choose__hint">Это только начало — новые карты найдутся по пути.</p>
      <div class="choose__decks">
        <button
          v-for="deck in decks"
          :key="deck.id"
          type="button"
          class="pixel-panel choose__deck"
          @click="pick(deck.id)"
        >
          <h2 class="choose__deck-name">{{ deck.name }}</h2>
          <p class="choose__deck-description">{{ deck.description }}</p>
          <ul class="choose__cards">
            <li v-for="card in deck.cards" :key="card.id">
              <CardFace :card="card" :tint="tintFor(card)" compact />
            </li>
          </ul>
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.choose {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 16px;
  overflow-y: auto;
  background: linear-gradient(#1d1a2e 0 55%, #2b2350 55% 70%, #2f6b3a 70% 100%);
}

.choose__box {
  display: grid;
  gap: 16px;
  width: min(100%, 720px);
  text-align: center;
}

.choose__title {
  font-size: clamp(16px, 5vw, 22px);
  color: var(--gold);
}

.choose__hint {
  font-size: 9px;
  color: var(--muted);
}

.choose__decks {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.choose__deck {
  display: grid;
  gap: 10px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition: transform 0.1s ease;
}

.choose__deck:hover,
.choose__deck:focus-visible {
  transform: translateY(-2px);
}

.choose__deck-name {
  font-size: 12px;
  color: var(--blue);
}

.choose__deck-description {
  font-size: 9px;
  line-height: 1.6;
  color: var(--muted);
}

.choose__cards {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
