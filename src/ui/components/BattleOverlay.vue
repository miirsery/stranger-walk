<script setup lang="ts">
import type { AttackTarget, BattleState, UnitState } from '@core/battle/cardBattle';
import type { CardDef } from '@core/content/types';
import type { GameSession } from '@core/session/gameSession';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useSettingsStore } from '../stores/settings';
import CardFace from './CardFace.vue';

const props = defineProps<{ session: GameSession; state: BattleState }>();

const selectedUid = ref<number | null>(null);
/** Индекс заклинания в руке, для которого сейчас выбирается цель. */
const aimingIndex = ref<number | null>(null);
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

// ---------- Обучение в первом бою ----------
// Шаг сменяется сам, когда игрок выполнил то, о чём подсказка.
const settings = useSettingsStore();
const TUTORIAL_STEPS = [
  'Число в синем углу карты — её цена в мане. Нажми на подсвеченную карту в руке, чтобы сыграть её.',
  'Существо сможет атаковать только со следующего хода. Нажми «Конец хода» — мана восполнится и вырастет на 1.',
  'Теперь атакуй: нажми на своё подсвеченное существо, затем на цель — существо врага или его героя.',
  'Если у врага есть «Защитник», сначала придётся бить его. Доведи здоровье героя врага до нуля — и победа твоя!',
] as const;
const tutorialStep = ref(settings.battleTutorialDone ? TUTORIAL_STEPS.length : 0);
const tutorialText = computed(() => TUTORIAL_STEPS[tutorialStep.value] ?? null);
const playerAttacked = ref(false);

const finishTutorial = (): void => {
  tutorialStep.value = TUTORIAL_STEPS.length;
  settings.battleTutorialDone = true;
};

watch(
  () => props.state,
  (state) => {
    if (tutorialStep.value === 0 && state.sides.player.board.length > 0) tutorialStep.value = 1;
    if (tutorialStep.value === 1 && state.turn >= 3 && state.active === 'player') tutorialStep.value = 2;
    if (tutorialStep.value === 2 && playerAttacked.value) tutorialStep.value = 3;
    if (state.winner && tutorialStep.value < TUTORIAL_STEPS.length) finishTutorial();
  },
);

const card = (cardId: string): CardDef => props.session.content.card(cardId);
const tint = (cardId: string): number => props.session.content.setting(card(cardId).setting).backgroundColor;

/** Цели выбранного существа (по правилу защитников) или заклинания, для которого выбирается цель. */
const targets = computed<AttackTarget[]>(() => {
  const mode = props.session.mode;
  // Обращение к props.state делает вычисление зависимым от снимка боя.
  if (mode.kind !== 'battle' || !myTurn.value || props.state.turn === 0) return [];
  if (aimingIndex.value !== null) return mode.battle.validPlayTargets('player', aimingIndex.value);
  return selectedUid.value === null ? [] : mode.battle.validTargets('player');
});
/** Заклинание усиления целится в свои существа, всё остальное — во врага. */
const aimingAtAllies = computed(() => {
  const mode = props.session.mode;
  const cardId = aimingIndex.value === null ? undefined : player.value.hand[aimingIndex.value];
  return mode.kind === 'battle' && cardId !== undefined && mode.battle.targetingOf(cardId) === 'ally';
});
const hasTarget = (uid: number): boolean => targets.value.some((target) => target.type === 'unit' && target.uid === uid);
const canTargetHero = computed(() => !aimingAtAllies.value && targets.value.some((target) => target.type === 'hero'));
const canTargetUnit = (uid: number): boolean => !aimingAtAllies.value && hasTarget(uid);
const canTargetAlly = (uid: number): boolean => aimingAtAllies.value && hasTarget(uid);

// ---------- Анимация атаки ----------
const LUNGE_MS = 320;
const lungeUid = ref<number | null>(null);
const hitUid = ref<number | null>(null);
const hitHero = ref<'player' | 'enemy' | null>(null);
let lungeTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.state.lastAttack?.seq,
  () => {
    const attack = props.state.lastAttack;
    if (!attack) return;
    lungeUid.value = attack.attackerUid;
    hitUid.value = attack.target.type === 'unit' ? attack.target.uid : null;
    hitHero.value = attack.target.type === 'hero' ? (attack.side === 'player' ? 'enemy' : 'player') : null;
    if (lungeTimer !== null) clearTimeout(lungeTimer);
    lungeTimer = setTimeout(() => {
      lungeUid.value = null;
      hitUid.value = null;
      hitHero.value = null;
    }, LUNGE_MS);
  },
);

const report = (result: { ok: true } | { ok: false; reason: string }): void => {
  message.value = result.ok ? '' : result.reason;
};

const playCard = (index: number): void => {
  selectedUid.value = null;
  const mode = props.session.mode;
  const cardId = player.value.hand[index];
  const needsTarget = mode.kind === 'battle' && cardId !== undefined && mode.battle.targetingOf(cardId) !== 'none';
  if (!needsTarget) {
    aimingIndex.value = null;
    report(props.session.battlePlayCard(index));
    return;
  }
  // Повторное нажатие на ту же карту отменяет прицеливание.
  if (aimingIndex.value === index) {
    aimingIndex.value = null;
    message.value = '';
    return;
  }
  const check = mode.battle.canPlay('player', index);
  if (!check.ok) {
    report(check);
    return;
  }
  aimingIndex.value = index;
  message.value = 'Выбери цель для заклинания';
};

const castAt = (target: AttackTarget): void => {
  if (aimingIndex.value === null) return;
  report(props.session.battlePlayCard(aimingIndex.value, target));
  aimingIndex.value = null;
};

const selectUnit = (unit: UnitState): void => {
  if (!myTurn.value) return;
  if (aimingIndex.value !== null) {
    if (canTargetAlly(unit.uid)) castAt({ type: 'unit', uid: unit.uid });
    return;
  }
  if (!unit.canAttack) {
    message.value = 'Это существо сейчас не может атаковать';
    return;
  }
  message.value = '';
  selectedUid.value = selectedUid.value === unit.uid ? null : unit.uid;
};

const attack = (target: AttackTarget): void => {
  if (aimingIndex.value !== null) {
    castAt(target);
    return;
  }
  if (selectedUid.value === null) {
    message.value = 'Сначала выбери своё существо';
    return;
  }
  const result = props.session.battleAttack(selectedUid.value, target);
  if (result.ok) playerAttacked.value = true;
  report(result);
  selectedUid.value = null;
  // Снимок боя уже обновился до установки флага — продвигаем обучение вручную.
  if (result.ok && tutorialStep.value === 2) tutorialStep.value = 3;
};

const endTurn = (): void => {
  selectedUid.value = null;
  aimingIndex.value = null;
  const result = props.session.battleEndTurn();
  report(result);
  if (result.ok) runEnemyTurn();
};

onBeforeUnmount(() => {
  stopEnemy();
  if (lungeTimer !== null) clearTimeout(lungeTimer);
});

watch(
  () => props.state.winner,
  () => {
    selectedUid.value = null;
    aimingIndex.value = null;
  },
);
</script>

<template>
  <section class="battle" aria-label="Карточный бой">
    <header class="battle__side">
      <button
        type="button"
        class="battle__hero battle__hero--enemy"
        :class="{ 'battle__hero--target': canTargetHero, 'battle__hero--hit': hitHero === 'enemy' }"
        :disabled="!canTargetHero"
        @click="attack({ type: 'hero' })"
      >
        <span class="battle__hero-name">{{ enemy.hero.name }}</span>
        <span :key="enemy.hero.health" class="battle__hp">♥ {{ Math.max(0, enemy.hero.health) }}</span>
      </button>
      <p class="battle__meta">Рука: {{ enemy.hand.length }} · Колода: {{ enemy.deck.length }}</p>
    </header>

    <div class="battle__board">
      <TransitionGroup tag="ul" name="unit" class="battle__row" aria-label="Существа противника">
        <li v-for="unit in enemy.board" :key="unit.uid">
          <button
            type="button"
            class="battle__slot"
            :class="{
              'battle__slot--target': canTargetUnit(unit.uid),
              'battle__slot--lunge-down': lungeUid === unit.uid,
              'battle__slot--hit': hitUid === unit.uid,
            }"
            :disabled="!canTargetUnit(unit.uid)"
            @click="attack({ type: 'unit', uid: unit.uid })"
          >
            <CardFace :card="card(unit.cardId)" :attack="unit.attack" :health="unit.health" :tint="tint(unit.cardId)" compact />
          </button>
        </li>
        <li v-if="enemy.board.length === 0" key="empty" class="battle__empty">стол противника пуст</li>
      </TransitionGroup>
      <div class="battle__divider" aria-hidden="true" />
      <TransitionGroup tag="ul" name="unit" class="battle__row" aria-label="Твои существа">
        <li v-for="unit in player.board" :key="unit.uid">
          <button
            type="button"
            class="battle__slot"
            :class="{
              'battle__slot--ready': myTurn && unit.canAttack && aimingIndex === null,
              'battle__slot--selected': selectedUid === unit.uid,
              'battle__slot--ally-target': canTargetAlly(unit.uid),
              'battle__slot--lunge-up': lungeUid === unit.uid,
              'battle__slot--hit': hitUid === unit.uid,
            }"
            :aria-pressed="selectedUid === unit.uid"
            @click="selectUnit(unit)"
          >
            <CardFace :card="card(unit.cardId)" :attack="unit.attack" :health="unit.health" :tint="tint(unit.cardId)" compact />
          </button>
        </li>
        <li v-if="player.board.length === 0" key="empty" class="battle__empty">сыграй карту из руки</li>
      </TransitionGroup>
    </div>

    <footer class="battle__side battle__side--player">
      <aside v-if="tutorialText && !state.winner" class="pixel-panel battle__tutorial" aria-live="polite">
        <p class="battle__tutorial-step">Обучение · {{ tutorialStep + 1 }}/{{ TUTORIAL_STEPS.length }}</p>
        <p>{{ tutorialText }}</p>
        <button type="button" class="pixel-button pixel-button--ghost battle__tutorial-skip" @click="finishTutorial">
          {{ tutorialStep === TUTORIAL_STEPS.length - 1 ? 'Понятно' : 'Пропустить' }}
        </button>
      </aside>
      <div class="battle__status">
        <div class="battle__hero" :class="{ 'battle__hero--hit': hitHero === 'player' }">
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
            :class="{
              'battle__slot--ready': myTurn && card(cardId).cost <= player.mana,
              'battle__slot--selected': aimingIndex === index,
            }"
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

.battle__slot--ally-target {
  cursor: crosshair;
  filter: drop-shadow(0 4px 0 var(--green));
  animation: pulse 0.6s steps(2) infinite;
}

.battle__slot--lunge-up {
  animation: lunge-up 0.3s steps(4);
}

.battle__slot--lunge-down {
  animation: lunge-down 0.3s steps(4);
}

.battle__slot--hit,
.battle__hero--hit {
  animation: shake 0.3s steps(6);
}

/* Появление существа на столе и его гибель. */
.unit-enter-active,
.unit-leave-active {
  transition:
    opacity 0.25s steps(4),
    transform 0.25s steps(4);
}

.unit-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.unit-leave-to {
  opacity: 0;
  transform: scale(0.6) rotate(8deg);
}

@keyframes lunge-up {
  40% {
    transform: translateY(-22px);
  }
}

@keyframes lunge-down {
  40% {
    transform: translateY(22px);
  }
}

@keyframes shake {
  25% {
    transform: translateX(-5px);
  }

  75% {
    transform: translateX(5px);
  }
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

.battle__tutorial {
  display: grid;
  flex: 1 1 100%;
  gap: 8px;
  max-width: 620px;
  padding: 12px;
  font-size: 8px;
  background: rgb(42 37 64 / 96%);
  box-shadow:
    inset 0 0 0 var(--px) var(--gold),
    0 var(--px) 0 var(--px) rgb(0 0 0 / 35%);
}

.battle__tutorial-step {
  color: var(--gold);
}

.battle__tutorial-skip {
  justify-self: end;
  padding: 6px 10px;
  font-size: 8px;
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
