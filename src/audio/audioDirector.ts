import type { GameSession, SessionEvent } from '@core/session/gameSession';
import type { ChiptuneAudio } from './chiptune';

/** Связывает события игры со звуком: выбирает трек под сцену и играет эффекты. */
export const attachAudio = (session: GameSession, audio: ChiptuneAudio): (() => void) => {
  const syncMusic = (): void => {
    const mode = session.mode;
    let trackId = session.world.map.setting.music;
    if (mode.kind === 'minigame') trackId = mode.def.music;
    if (mode.kind === 'battle') trackId = mode.boss.music;
    audio.playTrack(session.content.track(trackId));
  };

  syncMusic();
  return session.events.on((event: SessionEvent) => {
    switch (event.type) {
      case 'modeChanged':
        syncMusic();
        break;
      case 'levelChanged':
        syncMusic();
        audio.playSfx('portal');
        break;
      case 'dialogAdvanced':
        audio.playSfx('blip');
        break;
      case 'questStarted':
      case 'minigameStarted':
        audio.playSfx('confirm');
        break;
      case 'questCompleted':
      case 'cardsGranted':
        audio.playSfx('reward');
        break;
      case 'battleUpdated':
        audio.playSfx('hit');
        break;
      case 'minigameFinished':
      case 'battleFinished':
        audio.playSfx(event.won ? 'win' : 'lose');
        break;
      case 'questUpdated':
        break;
    }
  });
};
