<script setup lang="ts">
import PageLayout from '../components/PageLayout.vue';

const rows = [
  { keys: ['W', 'A', 'S', 'D'], alt: ['↑', '←', '↓', '→'], text: 'Движение по карте. В мини-игре — корзина влево и вправо.' },
  { keys: ['E'], alt: ['Пробел', 'Enter'], text: 'Действие: заговорить с персонажем, листать диалог.' },
  { keys: ['C'], alt: [], text: 'Открыть колоду: посмотреть карты и выбрать, какие идут в бой.' },
  { keys: ['Esc'], alt: [], text: 'Пауза и выход в меню.' },
];
</script>

<template>
  <PageLayout title="Управление">
    <section class="pixel-panel controls">
      <h2 class="controls__heading">Клавиатура</h2>
      <div v-for="row in rows" :key="row.text" class="controls__row">
        <div class="controls__keys">
          <kbd v-for="key in row.keys" :key="key">{{ key }}</kbd>
          <template v-if="row.alt.length">
            <span class="controls__or">или</span>
            <kbd v-for="key in row.alt" :key="key">{{ key }}</kbd>
          </template>
        </div>
        <p>{{ row.text }}</p>
      </div>
    </section>
    <section class="pixel-panel controls">
      <h2 class="controls__heading">Сенсорный экран</h2>
      <p>На телефоне и планшете слева появляется крестовина для движения, справа — кнопка действия «A».</p>
      <p>Показ сенсорных кнопок можно включить принудительно в настройках.</p>
    </section>
    <section class="pixel-panel controls">
      <h2 class="controls__heading">Карточный бой</h2>
      <p>Нажми на карту в руке, чтобы сыграть её. Нажми на своё существо, затем на цель — чтобы атаковать.</p>
      <p>Кнопка «Конец хода» передаёт ход противнику — он ходит по одному действию, журнал боя показывает каждое.</p>
    </section>
  </PageLayout>
</template>

<style scoped>
.controls {
  display: grid;
  gap: 16px;
}

.controls__heading {
  font-size: 13px;
  color: var(--gold);
}

.controls__row {
  display: grid;
  gap: 10px;
}

.controls__keys {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.controls__or {
  font-size: 9px;
  color: var(--muted);
}
</style>
