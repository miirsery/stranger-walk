<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { audio } from '@/audio/chiptune';
import PageLayout from '../components/PageLayout.vue';
import type { TouchControlsMode } from '../stores/settings';
import { useSettingsStore } from '../stores/settings';

const { musicVolume, sfxVolume, touchControls } = storeToRefs(useSettingsStore());

const touchOptions: { value: TouchControlsMode; label: string }[] = [
  { value: 'auto', label: 'Авто' },
  { value: 'on', label: 'Всегда' },
  { value: 'off', label: 'Скрыть' },
];

const percent = (value: number): string => `${Math.round(value * 100)}%`;
</script>

<template>
  <PageLayout title="Настройки">
    <section class="pixel-panel settings">
      <label class="settings__row">
        <span>Музыка</span>
        <input v-model.number="musicVolume" class="settings__range" type="range" min="0" max="1" step="0.05" />
        <output>{{ percent(musicVolume) }}</output>
      </label>
      <label class="settings__row">
        <span>Эффекты</span>
        <input
          v-model.number="sfxVolume"
          class="settings__range"
          type="range"
          min="0"
          max="1"
          step="0.05"
          @change="audio.playSfx('confirm')"
        />
        <output>{{ percent(sfxVolume) }}</output>
      </label>
    </section>
    <section class="pixel-panel settings">
      <fieldset class="settings__group">
        <legend>Сенсорные кнопки</legend>
        <div class="settings__options">
          <button
            v-for="option in touchOptions"
            :key="option.value"
            type="button"
            class="pixel-button"
            :class="{ 'pixel-button--ghost': touchControls !== option.value }"
            :aria-pressed="touchControls === option.value"
            @click="touchControls = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </fieldset>
      <p class="settings__note">«Авто» показывает кнопки только на устройствах с сенсорным экраном.</p>
    </section>
  </PageLayout>
</template>

<style scoped>
.settings {
  display: grid;
  gap: 20px;
}

.settings__row {
  display: grid;
  grid-template-columns: 96px 1fr 56px;
  gap: 12px;
  align-items: center;
}

.settings__range {
  width: 100%;
  height: 24px;
  accent-color: var(--gold);
}

.settings__group {
  padding: 0;
  margin: 0;
  border: 0;
}

.settings__group legend {
  padding: 0;
  margin-bottom: 12px;
}

.settings__options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.settings__note {
  font-size: 9px;
  color: var(--muted);
}
</style>
