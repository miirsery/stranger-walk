<script setup lang="ts">
import { RouterView } from 'vue-router';
import CrashScreen from './components/CrashScreen.vue';
import { useUiScale } from './composables/useUiScale';
import { crashed } from './crash';

useUiScale();
</script>

<template>
  <CrashScreen v-if="crashed" />
  <RouterView v-else />
</template>
