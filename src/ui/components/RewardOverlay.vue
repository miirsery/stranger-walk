<script setup lang="ts">
import type { CardDef } from '@core/content/types';
import type { GameSession } from '@core/session/gameSession';
import CardFace from './CardFace.vue';

const props = defineProps<{ session: GameSession; title: string; options: string[] }>();

const card = (cardId: string): CardDef => props.session.content.card(cardId);
const tint = (cardId: string): number => props.session.content.setting(card(cardId).setting).backgroundColor;
const owned = (cardId: string): number => props.session.cards.count(cardId);
</script>

<template>
  <div class="reward" role="dialog" aria-modal="true" :aria-label="title">
    <div class="pixel-panel reward__box">
      <h2 class="reward__title">{{ title }}</h2>
      <p>Выбери одну карту — остальные исчезнут.</p>
      <ul class="reward__options">
        <li v-for="(cardId, index) in options" :key="cardId" class="reward__option">
          <button
            type="button"
            class="reward__card"
            :autofocus="index === 0"
            :aria-label="`Взять карту: ${card(cardId).name}`"
            @click="session.chooseReward(index)"
          >
            <CardFace :card="card(cardId)" :tint="tint(cardId)" />
          </button>
          <p class="reward__text">{{ card(cardId).text }}</p>
          <p class="reward__owned">{{ owned(cardId) ? `уже есть: ${owned(cardId)}` : 'новая карта' }}</p>
        </li>
      </ul>
      <button type="button" class="pixel-button pixel-button--ghost reward__later" @click="session.declineReward()">
        Не сейчас
      </button>
    </div>
  </div>
</template>

<style scoped>
.reward {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 12px;
  background: rgb(20 18 31 / 82%);
}

.reward__box {
  display: grid;
  gap: 14px;
  justify-items: center;
  width: min(100%, 520px);
  max-height: 100%;
  padding: 20px;
  overflow-y: auto;
  font-size: 9px;
  text-align: center;
}

.reward__title {
  font-size: 16px;
  color: var(--gold);
}

.reward__options {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 20px;
  justify-content: center;
  padding: 10px 0 0;
  margin: 0;
  list-style: none;
}

.reward__option {
  display: grid;
  gap: 8px;
  justify-items: center;
  width: 112px;
}

.reward__card {
  display: block;
  padding: 0;
  cursor: pointer;
  background: none;
  border: 0;
  transition: transform 0.1s steps(2);
}

.reward__card:hover,
.reward__card:focus-visible {
  outline: none;
  filter: drop-shadow(0 4px 0 var(--gold));
  transform: translateY(-8px);
}

.reward__text {
  min-height: 3.4em;
  font-size: 7px;
  color: var(--muted);
}

.reward__owned {
  font-size: 7px;
  color: var(--green);
}

.reward__later {
  padding: 8px 12px;
}
</style>
