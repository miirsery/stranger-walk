<script setup lang="ts">
import type { CardDef, CardRarity } from '@core/content/types';
import { computed } from 'vue';
import { KEYWORD_LABELS } from './cardKeywords';

/** Непустых редкостей (common — без значка) столько ромбиков в углу — дублирует цвет рамки текстом/формой. */
const RARITY_PIPS: Partial<Record<CardRarity, number>> = { rare: 1, epic: 2, legendary: 3 };

/** Карты, для которых нарисована иллюстрация (`public/assets/cards/<id>.webp`) — для остальных буква на фоне. */
const CARD_ART_IDS = new Set([
  'sprout', 'scarecrow', 'fox', 'reaper', 'bull', 'feast', 'viper', 'hive',
  'crab', 'torpedo', 'diver', 'kraken', 'mine', 'harpoon', 'depth_charge', 'jellyfish',
  'squire', 'archer', 'knight', 'gargoyle', 'shadow', 'ghost', 'blessing', 'banner',
  'drone', 'astronaut', 'turret', 'shield', 'titan', 'laser', 'star_map', 'comet', 'meteor',
]);

const props = defineProps<{
  card: CardDef;
  /** Текущие значения существа на столе; для карты в руке — не заданы. */
  attack?: number;
  health?: number;
  /** Цвет сеттинга карты, 0xRRGGBB. */
  tint: number;
  compact?: boolean;
  /** Значок «?» с полным текстом карты — только там, где его слушают (сейчас бой). */
  inspectable?: boolean;
}>();

const emit = defineEmits<{ inspectHover: []; inspectToggle: [] }>();

const tintCss = computed(() => `#${props.tint.toString(16).padStart(6, '0')}`);
const artUrl = computed(() => (CARD_ART_IDS.has(props.card.id) ? `${import.meta.env.BASE_URL}assets/cards/${props.card.id}.webp` : null));
const unit = computed(() => (props.card.type === 'unit' ? props.card : null));
const attack = computed(() => props.attack ?? unit.value?.attack ?? 0);
const health = computed(() => props.health ?? unit.value?.health ?? 0);
const damaged = computed(() => unit.value !== null && health.value < unit.value.health);
const buffed = computed(() => unit.value !== null && (health.value > unit.value.health || attack.value > unit.value.attack));
const rarityPips = computed(() => RARITY_PIPS[props.card.rarity] ?? 0);
</script>

<template>
  <span class="card" :class="[`card--${card.rarity}`, { 'card--compact': compact, 'card--spell': !unit }]">
    <span
      v-if="inspectable"
      class="card__info"
      role="button"
      tabindex="0"
      aria-label="Что делает карта"
      @mouseenter="emit('inspectHover')"
      @click.stop="emit('inspectToggle')"
      @keydown.enter.space.stop.prevent="emit('inspectToggle')"
    >
      ?
    </span>
    <span class="card__cost" aria-label="Стоимость">{{ card.cost }}</span>
    <!-- Редкость дублируется ромбиками — рамка цветом дальтонику ничего не скажет. -->
    <span v-if="rarityPips > 0" class="card__rarity" :aria-label="`Редкость: ${card.rarity}`">{{ '◆'.repeat(rarityPips) }}</span>
    <span class="card__art" :style="{ background: tintCss }" aria-hidden="true">
      <img v-if="artUrl" :src="artUrl" class="card__art-img" alt="" />
      <template v-else>{{ card.name.charAt(0) }}</template>
    </span>
    <span class="card__name">{{ card.name }}</span>
    <span v-if="unit && unit.keywords.length" class="card__keywords">
      {{ unit.keywords.map((keyword) => KEYWORD_LABELS[keyword]).join(' · ') }}
    </span>
    <span v-else-if="unit?.onPlay || unit?.onDeath || unit?.aura" class="card__keywords">Эффект</span>
    <span v-if="unit" class="card__stats" :class="{ 'card__stats--buffed': buffed }">
      <!-- Значки ⚔/♥ отличают атаку от здоровья не только цветом фона. -->
      <span class="card__attack" aria-label="Атака">⚔{{ attack }}<span v-if="buffed" aria-hidden="true">▲</span></span>
      <!-- key по здоровью перезапускает анимацию удара при каждом изменении -->
      <span :key="health" class="card__health" :class="{ 'card__health--damaged': damaged }" aria-label="Здоровье">
        ♥{{ health }}
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
  --rarity: var(--epic);
}

.card--legendary {
  --rarity: var(--gold);
}

.card--compact {
  width: 76px;
  height: 104px;
}

.card__info {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  padding: 0;
  font-family: inherit;
  font-size: 9px;
  color: var(--ink);
  cursor: help;
  background: var(--gold);
  border: 2px solid var(--ink);
  border-radius: 50%;
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
  background: var(--cost);
  border: 3px solid var(--ink);
}

.card__rarity {
  position: absolute;
  bottom: -2px;
  left: -2px;
  font-size: 6px;
  /* Текст — всегда var(--ink), чтобы читался на светлом лице карты в любой теме;
     цвет самой редкости остаётся на рамке (--rarity), это просто усиливающий намёк. */
  color: var(--ink);
  text-shadow: 1px 1px 0 var(--rarity);
}

.card__art {
  display: grid;
  overflow: hidden;
  place-items: center;
  height: 40px;
  font-size: 16px;
  color: rgb(255 255 255 / 85%);
  text-shadow: 2px 2px 0 rgb(0 0 0 / 40%);
  border: 2px solid var(--ink);
}

.card__art-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
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
  overflow: hidden;
  white-space: nowrap;
  font-size: 6px;
  color: var(--effect);
}

.card__stats {
  display: flex;
  grid-row: 4;
  justify-content: space-between;
  font-size: 8px;
}

.card__attack,
.card__health {
  display: grid;
  place-items: center;
  width: 24px;
  height: 20px;
  color: var(--text);
  border: 2px solid var(--ink);
}

.card__attack {
  background: var(--attack);
}

.card__health {
  background: var(--red);
}

.card__health {
  animation: card-hit 0.25s steps(3);
}

.card__health--damaged {
  color: #ffd0c9;
  background: color-mix(in srgb, var(--red) 55%, black);
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
  color: var(--effect);
  text-transform: uppercase;
}

@keyframes card-hit {
  0% {
    transform: scale(1.6);
  }
}
</style>
