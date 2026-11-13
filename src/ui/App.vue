<script setup lang="ts">
import { RouterView } from 'vue-router';
import { useUiScale } from './composables/useUiScale';

useUiScale();
</script>

<template>
  <RouterView />
</template>
