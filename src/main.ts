import '@fontsource/press-start-2p/cyrillic-400.css';
import '@fontsource/press-start-2p/latin-400.css';
import './ui/styles/main.css';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { audio } from './audio/chiptune';
import App from './ui/App.vue';
import { reportCrash } from './ui/crash';
import { router } from './ui/router';

const app = createApp(App);
app.config.errorHandler = (error) => reportCrash(error);
app.use(createPinia()).use(router).mount('#app');

// Ловит и то, что проходит мимо Vue: игровой цикл Phaser живёт вне его реактивности.
window.addEventListener('error', (event) => reportCrash(event.error ?? event.message));
window.addEventListener('unhandledrejection', (event) => reportCrash(event.reason));

// Звук в браузере можно включить только после первого жеста пользователя.
const unlock = (): void => audio.unlock();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);
// Скрытая вкладка не должна шуметь.
document.addEventListener('visibilitychange', () => audio.setMuted(document.hidden));
