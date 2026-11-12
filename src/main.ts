import '@fontsource/press-start-2p/cyrillic-400.css';
import '@fontsource/press-start-2p/latin-400.css';
import './ui/styles/main.css';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { audio } from './audio/chiptune';
import App from './ui/App.vue';
import { router } from './ui/router';

createApp(App).use(createPinia()).use(router).mount('#app');

// Звук в браузере можно включить только после первого жеста пользователя.
const unlock = (): void => audio.unlock();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);
// Скрытая вкладка не должна шуметь.
document.addEventListener('visibilitychange', () => audio.setMuted(document.hidden));
