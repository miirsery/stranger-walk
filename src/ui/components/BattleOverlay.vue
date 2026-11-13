<script setup lang="ts">
import type { AttackTarget, BattleState, UnitState } from '@core/battle/cardBattle';
import type { CardDef } from '@core/content/types';
import type { GameSession } from '@core/session/gameSession';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import CardFace from './CardFace.vue';

const props = defineProps<{ session: GameSession; state: BattleState }>();

const selectedUid = ref<number | null>(null);
const message = ref('');

const player = computed(() => props.state.sides.player);
const enemy = computed(() => props.state.sides.enemy);
const myTurn = computed(() => props.state.active === 'player' && props.state.winner === null);
const enemyTurn = computed(() => props.state.active === 'enemy' && props.state.winner === null);
const lastLog = computed(() => props.state.log.slice(-4));

/** Пауза между действиями противника, чтобы игрок успевал следить за ходом. */
const ENEMY_STEP_MS = 700;
let enemyTimer: ReturnType<typeof setInterval> | null = null;

const stopEnemy = (): void => {
  if (enemyTimer !== null) clearInterval(enemyTimer);
  enemyTimer = null;
};

const runEnemyTurn = (): void => {
  stopEnemy();
  enemyTimer = setInterval(() => {
    if (!props.session.battleEnemyStep()) stopEnemy();
  }, ENEMY_STEP_MS);
};

const card = (cardId: string): CardDef => props.session.content.card(cardId);
const tint = (cardId: string): number => props.session.content.setting(card(cardId).setting).backgroundColor;

/** Цели, доступные выбранному существу (по правилу защитников). */
const targets = computed<AttackTarget[]>(() => {
  const mode = props.session.mode;
  if (selectedUid.value === null || mode.kind !== 'battle' || !myTurn.value) return [];
  // Обращение к props.state делает вычисление зависимым от снимка боя.
  return props.state.turn > 0 ? mode.battle.validTargets('player') : [];
});
const canTargetHero = computed(() => targets.value.some((target) => target.type === 'hero'));
const canTargetUnit = (uid: number): boolean =>
  targets.value.some((target) => target.type === 'unit' && target.uid === uid);

const report = (result: { ok: true } | { ok: false; reason: string }): void => {
  message.value = result.ok ? '' : result.reason;
};

const playCard = (index: number): void => {
  selectedUid.value = null;
  report(props.session.battlePlayCard(index));
};

const selectUnit = (unit: UnitState): void => {
  if (!myTurn.value) return;
  if (!unit.canAttack) {
    message.value = 'Это существо сейчас не может атаковать';
    return;
  }
  message.value = '';
  selectedUid.value = selectedUid.value === unit.uid ? null : unit.uid;
};

const attack = (target: AttackTarget): void => {
  if (selectedUid.value === null) {
    message.value = 'Сначала выбери своё существо';
    return;
  }
  report(props.session.battleAttack(selectedUid.value, target));
  selectedUid.value = null;
};

const endTurn = (): void => {
  selectedUid.value = null;
  const result = props.session.battleEndTurn();
  report(result);
  if (result.ok) runEnemyTurn();
};

onBeforeUnmount(stopEnemy);

watch(
  () => props.state.winner,
  () => {
    selectedUid.value = null;
  },
);
</script>

<template>
  <section class="battle" aria-label="Карточный бой">
    <header class="battle__side">
      <button
        type="button"
        class="battle__hero battle__hero--enemy"
        :class="{ 'battle__hero--target': canTargetHero }"
        :disabled="!canTargetHero"
        @click="attack({ type: 'hero' })"
      >
        <span class="battle__hero-name">{{ enemy.hero.name }}</span>
        <span :key="enemy.hero.health" class="battle__hp">♥ {{ Math.max(0, enemy.hero.health) }}</span>
      </button>
      <p class="battle__meta">Рука: {{ enemy.hand.length }} · Колода: {{ enemy.deck.length }}</p>
    </header>

    <div class="battle__board">
      <ul class="battle__row" aria-label="Существа противника">
        <li v-for="unit in enemy.board" :key="unit.uid">
          <button
            type="button"
            class="battle__slot"
            :class="{ 'battle__slot--target': canTargetUnit(unit.uid) }"
            :disabled="!canTargetUnit(unit.uid)"
            @click="attack({ type: 'unit', uid: unit.uid })"
          >
            <CardFace :card="card(unit.cardId)" :attack="unit.attack" :health="unit.health" :tint="tint(unit.cardId)" compact />
          </button>
        </li>
        <li v-if="enemy.board.length === 0" class="battle__empty">стол противника пуст</li>
      </ul>
      <div class="battle__divider" aria-hidden="true" />
      <ul class="battle__row" aria-label="Твои существа">
        <li v-for="unit in player.board" :key="unit.uid">
          <button
            type="button"
            class="battle__slot"
            :class="{
              'battle__slot--ready': myTurn && unit.canAttack,
              'battle__slot--selected': selectedUid === unit.uid,
            }"
            :aria-pressed="selectedUid === unit.uid"
            @click="selectUnit(unit)"
          >
            <CardFace :card="card(unit.cardId)" :attack="unit.attack" :health="unit.health" :tint="tint(unit.cardId)" compact />
          </button>
        </li>
        <li v-if="player.board.length === 0" class="battle__empty">сыграй карту из руки</li>
      </ul>
    </div>

    <footer class="battle__side battle__side--player">
      <div class="battle__status">
        <div class="battle__hero">
          <span class="battle__hero-name">{{ player.hero.name }}</span>
          <span :key="player.hero.health" class="battle__hp">♥ {{ Math.max(0, player.hero.health) }}</span>
        </div>
        <p class="battle__mana" :aria-label="`Мана: ${player.mana} из ${player.maxMana}`">
          <span v-for="index in player.maxMana" :key="index" class="battle__crystal" :class="{ 'battle__crystal--spent': index > player.mana }" />
          <span>{{ player.mana }}/{{ player.maxMana }}</span>
        </p>
        <p v-if="message" class="battle__message" aria-live="polite">{{ message }}</p>
        <ol class="battle__log" aria-label="Журнал боя" aria-live="polite">
          <li v-for="(line, index) in lastLog" :key="`${state.log.length}-${index}`">{{ line }}</li>
        </ol>
        <div class="battle__actions">
          <button type="button" class="pixel-button" :disabled="!myTurn" @click="endTurn">
            {{ enemyTurn ? 'Ход врага…' : 'Конец хода' }}
          </button>
          <button type="button" class="pixel-button pixel-button--ghost" @click="session.leaveBattle()">Сдаться</button>
        </div>
      </div>
      <ul class="battle__hand" aria-label="Рука">
        <li v-for="(cardId, index) in player.hand" :key="`${index}-${cardId}`">
          <button
            type="button"
            class="battle__slot"
            :class="{ 'battle__slot--ready': myTurn && card(cardId).cost <= player.mana }"
            :disabled="!myTurn"
            :title="card(cardId).text"
            @click="playCard(index)"
          >
            <CardFace :card="card(cardId)" :tint="tint(cardId)" />
          </button>
        </li>
      </ul>
    </footer>

    <div v-if="state.winner" class="battle__result" role="dialog" aria-modal="true" aria-label="Итог боя">
      <div class="pixel-panel battle__result-box">
        <h2 :class="state.winner === 'player' ? 'battle__win' : 'battle__lose'">
          {{ state.winner === 'player' ? 'Победа!' : 'Поражение' }}
        </h2>
        <button type="button" class="pixel-button" @click="session.leaveBattle()">Продолжить</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.battle {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 8px;
  padding: 12px 72px 12px 12px;
  overflow-y: auto;
  font-size: 9px;
  background:
    linear-gradient(rgb(20 18 31 / 82%), rgb(20 18 31 / 94%)),
    repeating-linear-gradient(45deg, #3a2a4d 0 8px, #2f2340 8px 16px);
}

.battle__side {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: center;
}

.battle__side--player {
  align-items: flex-end;
}

.battle__hero {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  background: var(--panel);
  border: var(--px) solid var(--ink);
  box-shadow: inset 0 0 0 2px var(--edge);
}

.battle__hero--enemy:disabled {
  color: inherit;
  cursor: default;
}

.battle__hero--target {
  cursor: crosshair;
  box-shadow: inset 0 0 0 3px var(--red);
  animation: pulse 0.6s steps(2) infinite;
}

.battle__hero-name {
  color: var(--gold);
}

.battle__hp {
  color: var(--red);
  animation: hp-change 0.3s steps(3);
}

@keyframes hp-change {
  0% {
    color: var(--text);
    transform: scale(1.5);
  }
}

.battle__meta {
  color: var(--muted);
}

.battle__board {
  display: grid;
  gap: 8px;
  align-content: center;
}

.battle__row,
.battle__hand {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: center;
  min-height: 112px;
  padding: 8px 0 0;
  margin: 0;
  list-style: none;
}

.battle__hand {
  flex: 1 1 320px;
  min-height: 140px;
}

.battle__divider {
  height: 4px;
  background: repeating-linear-gradient(90deg, var(--edge) 0 8px, transparent 8px 16px);
}

.battle__empty {
  color: var(--edge);
}

.battle__slot {
  display: block;
  padding: 0;
  cursor: pointer;
  background: none;
  border: 0;
  transition: transform 0.1s steps(2);
}

.battle__slot:disabled {
  cursor: default;
}

.battle__slot--ready {
  filter: drop-shadow(0 0 0 var(--green)) drop-shadow(0 4px 0 var(--green));
}

.battle__slot--ready:hover,
.battle__slot--ready:focus-visible,
.battle__slot--selected {
  outline: none;
  transform: translateY(-8px);
}

.battle__slot--selected {
  filter: drop-shadow(0 4px 0 var(--gold));
}

.battle__slot--target {
  cursor: crosshair;
  filter: drop-shadow(0 4px 0 var(--red));
  animation: pulse 0.6s steps(2) infinite;
}

.battle__status {
  display: grid;
  gap: 8px;
  justify-items: start;
  width: min(100%, 300px);
}

.battle__mana {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  color: var(--blue);
}

.battle__crystal {
  width: 10px;
  height: 10px;
  background: var(--blue);
  border: 2px solid var(--ink);
  transform: rotate(45deg);
}

.battle__crystal--spent {
  background: var(--panel-light);
}

.battle__message {
  color: var(--red);
}

.battle__log {
  display: grid;
  gap: 2px;
  min-height: 7em;
  padding: 0;
  margin: 0;
  font-size: 7px;
  color: var(--muted);
  list-style: none;
}

.battle__log li:last-child {
  color: var(--text);
}

.battle__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.battle__result {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(20 18 31 / 75%);
}

.battle__result-box {
  display: grid;
  gap: 20px;
  padding: 28px 36px;
  text-align: center;
}

.battle__win {
  font-size: 20px;
  color: var(--gold);
}

.battle__lose {
  font-size: 20px;
  color: var(--red);
}

/* Телефон: рука — одна прокручиваемая строка, журнал короче, всё помещается без вертикальной прокрутки. */
@media (width <= 600px) {
  .battle {
    gap: 4px;
    padding: 8px;
  }

  .battle__side {
    gap: 6px;
    justify-content: flex-start;
  }

  .battle__row {
    gap: 8px;
    min-height: 108px;
  }

  .battle__status {
    width: 100%;
  }

  .battle__log {
    min-height: 3.4em;
  }

  .battle__log li:nth-last-child(n + 3) {
    display: none;
  }

  .battle__hand {
    flex: 1 1 100%;
    flex-wrap: nowrap;
    justify-content: flex-start;
    min-height: 0;
    padding: 12px 8px 8px 10px;
    overflow-x: auto;
    scroll-snap-type: x proximity;
  }

  .battle__hand > li {
    flex: none;
    scroll-snap-align: start;
  }

  .battle__hand :deep(.card) {
    width: 76px;
    height: 104px;
  }

  .battle__hand :deep(.card__art) {
    height: 28px;
    font-size: 12px;
  }
}

@keyframes pulse {
  50% {
    opacity: 0.75;
  }
}
</style>
