<script setup lang="ts">
import { RouterView } from 'vue-router';
import CrashScreen from './components/CrashScreen.vue';
import { useAccessibility } from './composables/useAccessibility';
import { useUiScale } from './composables/useUiScale';
import { crashed } from './crash';

useUiScale();
useAccessibility();
</script>

<template>
  <CrashScreen v-if="crashed" />
  <RouterView v-else />
</template>
