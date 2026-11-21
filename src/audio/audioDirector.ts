import type { GameSession, SessionEvent } from '@core/session/gameSession';
import type { ChiptuneAudio } from './chiptune';

/** Связывает события игры со звуком: выбирает трек под сцену и играет эффекты. */
export const attachAudio = (session: GameSession, audio: ChiptuneAudio): (() => void) => {
  // Один из двух треков сеттинга выбирается наугад при входе в его мир и держится, пока мир не сменится, —
  // иначе пауза/диалог/бой пересчитывали бы выбор на каждую смену режима.
  let worldSettingId: string | null = null;
  let worldTrackId = '';
  const worldMusicTrack = (): string => {
    const setting = session.world.map.setting;
    if (setting.id !== worldSettingId) {
      worldSettingId = setting.id;
      worldTrackId = setting.musicAlt && Math.random() < 0.5 ? setting.musicAlt : setting.music;
    }
    return worldTrackId;
  };

  const syncMusic = (): void => {
    const mode = session.mode;
    let trackId = worldMusicTrack();
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
