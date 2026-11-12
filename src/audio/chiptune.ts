import type { MusicTrackDef } from '@core/content/types';

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** «A4» → 440 Гц. Возвращает null для паузы или нераспознанной ноты. */
export const noteToFrequency = (note: string): number | null => {
  const match = /^([A-G])(#?)(\d)$/.exec(note);
  if (!match) return null;
  const [, letter = '', sharp, octave = '4'] = match;
  const semitone = (SEMITONES[letter] ?? 0) + (sharp ? 1 : 0);
  const midi = (Number(octave) + 1) * 12 + semitone;
  return 440 * 2 ** ((midi - 69) / 12);
};

export type SfxName = 'blip' | 'confirm' | 'reward' | 'hit' | 'win' | 'lose' | 'portal';

type Tone = readonly [frequency: number, durationSec: number];

const SFX: Record<SfxName, { wave: OscillatorType; tones: readonly Tone[] }> = {
  blip: { wave: 'square', tones: [[660, 0.05]] },
  confirm: { wave: 'square', tones: [[523, 0.07], [784, 0.1]] },
  reward: { wave: 'square', tones: [[523, 0.07], [659, 0.07], [784, 0.07], [1047, 0.16]] },
  hit: { wave: 'sawtooth', tones: [[180, 0.05], [110, 0.08]] },
  win: { wave: 'square', tones: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.1], [1319, 0.3]] },
  lose: { wave: 'triangle', tones: [[392, 0.15], [330, 0.15], [262, 0.15], [196, 0.35]] },
  portal: { wave: 'triangle', tones: [[330, 0.06], [440, 0.06], [587, 0.06], [880, 0.12]] },
};

const LOOKAHEAD_SEC = 0.15;
const TICK_MS = 40;

/**
 * Чиптюн-синтезатор на Web Audio: квадратная волна — мелодия, треугольная — бас.
 * Музыка и эффекты синтезируются на лету из данных, аудиофайлы не нужны.
 */
export class ChiptuneAudio {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicVolume = 0;
  private sfxVolume = 0.25;
  private muted = false;

  private track: MusicTrackDef | null = null;
  private lead: string[] = [];
  private bass: string[] = [];
  private step = 0;
  private nextStepTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  /** Браузеры разрешают звук только после жеста пользователя — вызывать из обработчика клика/клавиши. */
  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended' && !this.muted) void this.ctx.resume();
  }

  /** Полная тишина, пока вкладка скрыта или приложение свёрнуто. */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.ctx) return;
    if (muted) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = volume;
    this.applyVolumes();
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = volume;
    this.applyVolumes();
  }

  /** Включает трек (или тишину при null). Повторный вызов с тем же треком ничего не меняет. */
  playTrack(track: MusicTrackDef | null): void {
    if (track?.id === this.track?.id) return;
    this.track = track;
    this.lead = track ? track.lead.split(/\s+/) : [];
    this.bass = track ? track.bass.split(/\s+/) : [];
    this.step = 0;
    this.nextStepTime = 0;
    if (track && this.timer === null) this.timer = setInterval(this.schedule, TICK_MS);
    if (!track && this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  playSfx(name: SfxName): void {
    if (!this.ctx || !this.sfxGain) return;
    const sfx = SFX[name];
    let time = this.ctx.currentTime;
    for (const [frequency, duration] of sfx.tones) {
      this.tone(this.sfxGain, sfx.wave, frequency, time, duration, 0.25);
      time += duration;
    }
  }

  private readonly schedule = (): void => {
    const { ctx, track, musicGain } = this;
    if (!ctx || !track || !musicGain || ctx.state !== 'running') return;
    const stepSec = 60 / track.bpm / 4;
    if (this.nextStepTime < ctx.currentTime) this.nextStepTime = ctx.currentTime + 0.05;
    while (this.nextStepTime < ctx.currentTime + LOOKAHEAD_SEC) {
      const lead = noteToFrequency(this.lead[this.step % this.lead.length] ?? '-');
      const bass = noteToFrequency(this.bass[this.step % this.bass.length] ?? '-');
      if (lead !== null) this.tone(musicGain, 'square', lead, this.nextStepTime, stepSec * 1.6, 0.11);
      if (bass !== null) this.tone(musicGain, 'triangle', bass, this.nextStepTime, stepSec * 1.9, 0.22);
      this.step += 1;
      this.nextStepTime += stepSec;
    }
  };

  private tone(output: GainNode, wave: OscillatorType, frequency: number, start: number, duration: number, level: number): void {
    if (!this.ctx) return;
    const oscillator = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(level, start);
    envelope.gain.setValueAtTime(level, start + duration * 0.6);
    envelope.gain.linearRampToValueAtTime(0, start + duration);
    oscillator.connect(envelope).connect(output);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private applyVolumes(): void {
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
  }
}

/** Один аудиодвижок на приложение: меню и игра делят его. */
export const audio = new ChiptuneAudio();
