<script setup lang="ts">
import type { ArtifactOffer, CardDef, TradeOffer } from '@core/content/types';
import type { GameSession } from '@core/session/gameSession';
import CardFace from './CardFace.vue';

const props = defineProps<{ session: GameSession; offers: TradeOffer[]; artifactOffers: ArtifactOffer[]; coins: number }>();

const card = (cardId: string): CardDef => props.session.content.card(cardId);
const tint = (cardId: string): number => props.session.content.setting(card(cardId).setting).backgroundColor;
const owned = (cardId: string): number => props.session.cards.count(cardId);
const canAfford = (price: number): boolean => props.coins >= price;

const artifactName = (artifactId: string): string => props.session.content.data.artifacts[artifactId]?.name ?? artifactId;
const artifactDescription = (artifactId: string): string => props.session.content.data.artifacts[artifactId]?.description ?? '';
const artifactOwned = (artifactId: string): boolean => props.session.artifacts().find((entry) => entry.def.id === artifactId)?.owned ?? false;
</script>

<template>
  <div class="trade" role="dialog" aria-modal="true" aria-label="Лавка торговца">
    <div class="pixel-panel trade__box">
      <h2 class="trade__title">Лавка торговца</h2>
      <p class="trade__coins">Монет: {{ coins }}</p>
      <ul class="trade__options">
        <li v-for="(offer, index) in offers" :key="`${index}-${offer.cardId}`" class="trade__option">
          <CardFace :card="card(offer.cardId)" :tint="tint(offer.cardId)" />
          <p class="trade__owned">{{ owned(offer.cardId) ? `уже есть: ${owned(offer.cardId)}` : 'новая карта' }}</p>
          <button
            type="button"
            class="pixel-button trade__buy"
            :class="{ 'pixel-button--ghost': !canAfford(offer.price) }"
            :disabled="!canAfford(offer.price)"
            :aria-label="`Купить «${card(offer.cardId).name}» за ${offer.price} монет`"
            @click="session.buyCard(index)"
          >
            Купить · {{ offer.price }}
          </button>
        </li>
      </ul>

      <template v-if="artifactOffers.length > 0">
        <h3 class="trade__subtitle">Артефакты</h3>
        <ul class="trade__options">
          <li v-for="(offer, index) in artifactOffers" :key="`${index}-${offer.artifactId}`" class="trade__option trade__option--artifact">
            <p class="trade__artifact-name">{{ artifactName(offer.artifactId) }}</p>
            <p class="trade__artifact-description">{{ artifactDescription(offer.artifactId) }}</p>
            <p class="trade__owned">{{ artifactOwned(offer.artifactId) ? 'уже найден' : '' }}</p>
            <button
              type="button"
              class="pixel-button trade__buy"
              :class="{ 'pixel-button--ghost': !canAfford(offer.price) || artifactOwned(offer.artifactId) }"
              :disabled="!canAfford(offer.price) || artifactOwned(offer.artifactId)"
              :aria-label="`Купить «${artifactName(offer.artifactId)}» за ${offer.price} монет`"
              @click="session.buyArtifact(index)"
            >
              Купить · {{ offer.price }}
            </button>
          </li>
        </ul>
      </template>

      <button type="button" class="pixel-button pixel-button--ghost trade__leave" autofocus @click="session.leaveTrade()">
        Уйти
      </button>
    </div>
  </div>
</template>

<style scoped>
.trade {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 12px;
  background: rgb(20 18 31 / 82%);
}

.trade__box {
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

.trade__title {
  font-size: 16px;
  color: var(--gold);
}

.trade__coins {
  color: var(--gold);
}

.trade__options {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 20px;
  justify-content: center;
  padding: 10px 0 0;
  margin: 0;
  list-style: none;
}

.trade__option {
  display: grid;
  gap: 8px;
  justify-items: center;
  width: 112px;
}

.trade__subtitle {
  font-size: 11px;
  color: var(--gold);
}

.trade__option--artifact {
  justify-items: center;
  width: 140px;
  padding: 10px;
  text-align: center;
  background: var(--panel-light);
}

.trade__artifact-name {
  color: var(--blue);
}

.trade__artifact-description {
  min-height: 2.8em;
  font-size: 7px;
  color: var(--muted);
}

.trade__owned {
  min-height: 1.4em;
  font-size: 7px;
  color: var(--green);
}

.trade__buy {
  padding: 8px 10px;
  font-size: 8px;
}

.trade__leave {
  padding: 8px 12px;
}
</style>
