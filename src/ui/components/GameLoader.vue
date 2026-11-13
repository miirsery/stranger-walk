<script setup lang="ts">
import { gameContent } from '@content/index';

// Случайный совет на время загрузки — из тех же подсказок, что на странице «Подсказки».
const hints = gameContent.hints;
const hint = hints[Math.floor(Math.random() * hints.length)];
</script>

<template>
  <div class="loader" role="status" aria-live="polite">
    <div class="loader__scene" aria-hidden="true">
      <div class="loader__walker">
        <span class="loader__hat" />
        <span class="loader__head" />
        <span class="loader__body" />
        <span class="loader__leg loader__leg--left" />
        <span class="loader__leg loader__leg--right" />
      </div>
      <div class="loader__ground" />
    </div>
    <p class="loader__title">Загружаем мир</p>
    <div class="loader__bar" aria-hidden="true">
      <span v-for="index in 8" :key="index" class="loader__block" :style="{ animationDelay: `${index * 0.12}s` }" />
    </div>
    <p v-if="hint" class="loader__hint">
      <span class="loader__hint-title">{{ hint.title }}.</span>
      {{ hint.text }}
    </p>
  </div>
</template>

<style scoped>
.loader {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: grid;
  gap: 20px;
  place-content: center;
  justify-items: center;
  padding: 24px;
  text-align: center;
  background: linear-gradient(#1d1a2e 0 60%, #2b2350 60% 74%, #2f6b3a 74% 100%);
}

.loader__scene {
  width: 160px;
}

/* Странник из шести прямоугольников: шагает на месте, а земля бежит навстречу. */
.loader__walker {
  position: relative;
  width: 48px;
  height: 64px;
  margin: 0 auto;
  animation: walker-bob 0.4s steps(2) infinite;
}

.loader__walker span {
  position: absolute;
}

.loader__hat {
  top: 0;
  left: 8px;
  width: 32px;
  height: 12px;
  background: #6b3f1d;
  box-shadow: 0 0 0 4px var(--ink);
}

.loader__head {
  top: 12px;
  left: 8px;
  width: 32px;
  height: 16px;
  background: #f0c9a0;
  box-shadow:
    0 0 0 4px var(--ink),
    inset -8px 4px 0 -4px var(--ink);
}

.loader__body {
  top: 32px;
  left: 4px;
  width: 40px;
  height: 20px;
  background: #d94f4f;
  box-shadow: 0 0 0 4px var(--ink);
}

.loader__leg {
  top: 52px;
  width: 8px;
  height: 12px;
  background: var(--ink);
}

.loader__leg--left {
  left: 12px;
  animation: leg-step 0.4s steps(1) infinite;
}

.loader__leg--right {
  left: 28px;
  animation: leg-step 0.4s steps(1) infinite reverse;
}

.loader__ground {
  height: 8px;
  margin-top: 4px;
  background: repeating-linear-gradient(90deg, var(--gold) 0 16px, transparent 16px 32px);
  animation: ground-run 0.4s steps(4) infinite;
}

.loader__title {
  font-size: 14px;
  color: var(--gold);
  text-shadow: 3px 3px 0 var(--ink);
}

.loader__bar {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--ink);
  border: var(--px) solid var(--edge);
}

.loader__block {
  width: 14px;
  height: 14px;
  background: var(--panel-light);
  animation: block-fill 0.96s steps(1) infinite;
}

.loader__hint {
  max-width: 420px;
  font-size: 9px;
  color: var(--text);
}

.loader__hint-title {
  color: var(--green);
}

@keyframes walker-bob {
  50% {
    transform: translateY(-4px);
  }
}

@keyframes leg-step {
  50% {
    height: 6px;
  }
}

@keyframes ground-run {
  to {
    background-position-x: -32px;
  }
}

@keyframes block-fill {
  0%,
  45% {
    background: var(--gold);
  }

  46%,
  100% {
    background: var(--panel-light);
  }
}
</style>
