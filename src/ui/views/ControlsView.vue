<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import PageLayout from '../components/PageLayout.vue';
import type { BindableKey } from '../stores/settings';
import { BINDABLE_KEYS, BINDABLE_KEY_LABELS, DEFAULT_KEY_BINDINGS, DEFAULT_PAD_ACTION_BUTTON, useSettingsStore } from '../stores/settings';

const { keyBindings, padActionButton } = storeToRefs(useSettingsStore());

/** Человекочитаемое имя кода клавиши — `KeyboardEvent.code` вроде `KeyW` или `ArrowLeft`. */
const KEY_LABELS: Record<string, string> = {
  Space: 'Пробел',
  Escape: 'Esc',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
};
const keyLabel = (code: string): string => {
  if (KEY_LABELS[code]) return KEY_LABELS[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
};

const listeningFor = ref<BindableKey | null>(null);
const conflictMessage = ref<string | null>(null);

const startListening = (key: BindableKey): void => {
  conflictMessage.value = null;
  listeningFor.value = key;
};

const cancelListening = (): void => {
  listeningFor.value = null;
  conflictMessage.value = null;
};

const onCaptureKey = (event: KeyboardEvent): void => {
  const key = listeningFor.value;
  if (!key) return;
  event.preventDefault();
  const conflictKey = BINDABLE_KEYS.find((candidate) => candidate !== key && keyBindings.value[candidate] === event.code);
  if (conflictKey) {
    conflictMessage.value = `Клавиша уже занята: «${BINDABLE_KEY_LABELS[conflictKey]}». Выбери другую или сначала переназначь ту клавишу.`;
    return;
  }
  keyBindings.value = { ...keyBindings.value, [key]: event.code };
  listeningFor.value = null;
  conflictMessage.value = null;
};

const resetKeyBindings = (): void => {
  keyBindings.value = { ...DEFAULT_KEY_BINDINGS };
  cancelListening();
};

// Геймпад не шлёт события нажатий — опрашиваем его в цикле, пока ждём новую кнопку.
const padListening = ref(false);
let padCaptureFrame = 0;

const stopPadCapture = (): void => {
  padListening.value = false;
  if (padCaptureFrame) cancelAnimationFrame(padCaptureFrame);
  padCaptureFrame = 0;
};

const startPadCapture = (): void => {
  const alreadyHeld = new Set<number>();
  for (const pad of navigator.getGamepads()) {
    if (!pad) continue;
    pad.buttons.forEach((button, index) => {
      if (button.pressed) alreadyHeld.add(index);
    });
  }
  padListening.value = true;
  const tick = (): void => {
    for (const pad of navigator.getGamepads()) {
      if (!pad) continue;
      for (let index = 0; index < pad.buttons.length; index += 1) {
        if (pad.buttons[index]?.pressed && !alreadyHeld.has(index)) {
          padActionButton.value = index;
          stopPadCapture();
          return;
        }
      }
    }
    padCaptureFrame = requestAnimationFrame(tick);
  };
  padCaptureFrame = requestAnimationFrame(tick);
};

const resetPadBinding = (): void => {
  padActionButton.value = DEFAULT_PAD_ACTION_BUTTON;
  stopPadCapture();
};

onMounted(() => window.addEventListener('keydown', onCaptureKey));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onCaptureKey);
  stopPadCapture();
});
</script>

<template>
  <PageLayout title="Управление">
    <section class="pixel-panel controls">
      <h2 class="controls__heading">Клавиатура</h2>
      <p class="controls__hint">Стрелки всегда двигают персонажа, Пробел/Enter всегда работают как действие — это запасной путь, даже если ниже назначены другие клавиши.</p>
      <div v-for="key in BINDABLE_KEYS" :key="key" class="controls__row">
        <span class="controls__label">{{ BINDABLE_KEY_LABELS[key] }}</span>
        <kbd v-if="listeningFor !== key">{{ keyLabel(keyBindings[key]) }}</kbd>
        <span v-else class="controls__listening">Нажми клавишу…</span>
        <button
          v-if="listeningFor !== key"
          type="button"
          class="pixel-button pixel-button--ghost controls__rebind"
          @click="startListening(key)"
        >
          Переназначить
        </button>
        <button v-else type="button" class="pixel-button pixel-button--ghost controls__rebind" @click="cancelListening">Отмена</button>
      </div>
      <p v-if="conflictMessage" class="controls__conflict">{{ conflictMessage }}</p>
      <button type="button" class="pixel-button pixel-button--ghost" @click="resetKeyBindings">Сбросить к стандартным</button>
    </section>
    <section class="pixel-panel controls">
      <h2 class="controls__heading">Сенсорный экран</h2>
      <p>На телефоне и планшете слева появляется джойстик: чем дальше тянешь, тем быстрее идёт персонаж. Справа — кнопка действия «A».</p>
      <p>Показ сенсорных кнопок можно включить принудительно в настройках.</p>
    </section>
    <section class="pixel-panel controls">
      <h2 class="controls__heading">Геймпад</h2>
      <p>Левый стик или крестовина — движение. Кнопка действия переназначается, по умолчанию — A/крест (кнопка 0).</p>
      <div class="controls__row">
        <span class="controls__label">Действие</span>
        <kbd v-if="!padListening">Кнопка {{ padActionButton }}</kbd>
        <span v-else class="controls__listening">Нажми любую кнопку геймпада…</span>
        <button v-if="!padListening" type="button" class="pixel-button pixel-button--ghost controls__rebind" @click="startPadCapture">
          Переназначить
        </button>
        <button v-else type="button" class="pixel-button pixel-button--ghost controls__rebind" @click="stopPadCapture">Отмена</button>
      </div>
      <button type="button" class="pixel-button pixel-button--ghost" @click="resetPadBinding">Сбросить к стандартной</button>
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
  gap: 14px;
}

.controls__heading {
  font-size: 13px;
  color: var(--gold);
}

.controls__hint {
  font-size: 9px;
  color: var(--muted);
}

.controls__row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.controls__label {
  width: 90px;
}

.controls__rebind {
  padding: 8px 10px;
  font-size: 8px;
}

.controls__listening {
  font-size: 9px;
  color: var(--gold);
}

.controls__conflict {
  font-size: 9px;
  color: var(--red);
}
</style>
