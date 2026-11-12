import { createRouter, createWebHashHistory } from 'vue-router';
import MainMenuView from './views/MainMenuView.vue';

// Hash-история работает без сервера — пригодится при упаковке в Capacitor/Tauri.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'menu', component: MainMenuView },
    // Игра (и Phaser) подгружается отдельным чанком только при старте.
    { path: '/play', name: 'play', component: () => import('./views/GameView.vue') },
    { path: '/controls', name: 'controls', component: () => import('./views/ControlsView.vue') },
    { path: '/story', name: 'story', component: () => import('./views/StoryView.vue') },
    { path: '/hints', name: 'hints', component: () => import('./views/HintsView.vue') },
    { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});
