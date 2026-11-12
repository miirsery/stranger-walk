<script setup lang="ts">
import type { CardDef, CardKeyword } from '@core/content/types';
import { computed } from 'vue';

const props = defineProps<{
  card: CardDef;
  /** Текущие значения существа на столе; для карты в руке — не заданы. */
  attack?: number;
  health?: number;
  /** Цвет сеттинга карты, 0xRRGGBB. */
  tint: number;
  compact?: boolean;
}>();

const KEYWORD_LABELS: Record<CardKeyword, string> = { guard: 'Защитник', charge: 'Рывок' };

const tintCss = computed(() => `#${props.tint.toString(16).padStart(6, '0')}`);
const unit = computed(() => (props.card.type === 'unit' ? props.card : null));
const attack = computed(() => props.attack ?? unit.value?.attack ?? 0);
const health = computed(() => props.health ?? unit.value?.health ?? 0);
const damaged = computed(() => unit.value !== null && health.value < unit.value.health);
const buffed = computed(() => unit.value !== null && (health.value > unit.value.health || attack.value > unit.value.attack));
</script>

<template>
  <span class="card" :class="[`card--${card.rarity}`, { 'card--compact': compact, 'card--spell': !unit }]">
    <span class="card__cost" aria-label="Стоимость">{{ card.cost }}</span>
    <span class="card__art" :style="{ background: tintCss }" aria-hidden="true">{{ card.name.charAt(0) }}</span>
    <span class="card__name">{{ card.name }}</span>
    <span v-if="unit && unit.keywords.length" class="card__keywords">
      {{ unit.keywords.map((keyword) => KEYWORD_LABELS[keyword]).join(' · ') }}
    </span>
    <span v-else-if="unit?.onPlay" class="card__keywords">При выходе</span>
    <span v-if="unit" class="card__stats" :class="{ 'card__stats--buffed': buffed }">
      <span class="card__attack" aria-label="Атака">{{ attack }}</span>
      <!-- key по здоровью перезапускает анимацию удара при каждом изменении -->
      <span :key="health" class="card__health" :class="{ 'card__health--damaged': damaged }" aria-label="Здоровье">
        {{ health }}
      </span>
    </span>
    <span v-else class="card__spell">Заклинание</span>
  </span>
</template>

<style scoped>
.card {
  --rarity: var(--muted);

  position: relative;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 4px;
  width: 92px;
  height: 128px;
  padding: 6px;
  font-size: 7px;
  line-height: 1.5;
  color: var(--ink);
  text-align: center;
  background: var(--text);
  border: 3px solid var(--ink);
  box-shadow: inset 0 0 0 2px var(--rarity);
}

.card--rare {
  --rarity: var(--blue);
}

.card--epic {
  --rarity: #b06fd8;
}

.card--legendary {
  --rarity: var(--gold);
}

.card--compact {
  width: 76px;
  height: 104px;
}

.card__cost {
  position: absolute;
  top: -8px;
  left: -8px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  font-size: 9px;
  color: var(--text);
  background: #3d6fd9;
  border: 3px solid var(--ink);
}

.card__art {
  display: grid;
  place-items: center;
  height: 40px;
  font-size: 16px;
  color: rgb(255 255 255 / 85%);
  text-shadow: 2px 2px 0 rgb(0 0 0 / 40%);
  border: 2px solid var(--ink);
}

.card--compact .card__art {
  height: 28px;
  font-size: 12px;
}

.card__name {
  overflow-wrap: anywhere;
}

.card__keywords {
  align-self: start;
  font-size: 6px;
  color: #7a4fb5;
}

.card__stats {
  display: flex;
  grid-row: 4;
  justify-content: space-between;
  font-size: 9px;
}

.card__attack,
.card__health {
  display: grid;
  place-items: center;
  width: 22px;
  height: 20px;
  color: var(--text);
  border: 2px solid var(--ink);
}

.card__attack {
  background: #c7772a;
}

.card__health {
  background: #c23b3b;
}

.card__health {
  animation: card-hit 0.25s steps(3);
}

.card__health--damaged {
  color: #ffd0c9;
  background: #7d2424;
}

.card__stats--buffed .card__attack {
  box-shadow: 0 0 0 2px var(--green);
}

.card--spell {
  background: #e3dcf5;
}

.card--spell .card__art {
  border-radius: 50%;
}

.card__spell {
  grid-row: 4;
  font-size: 6px;
  color: #7a4fb5;
  text-transform: uppercase;
}

@keyframes card-hit {
  0% {
    transform: scale(1.6);
  }
}
</style>
