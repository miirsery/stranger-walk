import type { MusicTrackDef } from '@core/content/types';

/** Ноты через пробел, «-» — пауза, один токен = одна шестнадцатая. Партии зацикливаются. */
export const music: Record<string, MusicTrackDef> = {
  fields: {
    id: 'fields',
    bpm: 132,
    lead: 'E5 - G5 - C6 - G5 - A5 - G5 - E5 - - - F5 - A5 - C6 - A5 - G5 - E5 - D5 - - -',
    bass: 'C3 - - - G3 - - - A2 - - - E3 - - - F2 - - - C3 - - - G2 - - - G3 - - -',
    drums: 'K - H - S - H - K - H - S - H - K - H - S - H - K - H - S - H -',
  },
  submarine: {
    id: 'submarine',
    bpm: 100,
    lead: 'A4 - - C5 - - E5 - D5 - - C5 - - A4 - G4 - - B4 - - D5 - C5 - - B4 - - - -',
    bass: 'A2 - A2 - A2 - A2 - F2 - F2 - F2 - F2 - G2 - G2 - G2 - G2 - E2 - E2 - E2 - E2 -',
    drums: 'K - - - - - - - S - - - - - - - K - - - - - - - S - - - - - - -',
  },
  castle: {
    id: 'castle',
    bpm: 110,
    lead: 'D5 - F5 - A5 - - - G5 - F5 - E5 - - - F5 - A5 - D6 - - - C#6 - A5 - E5 - - -',
    bass: 'D3 - - D3 A2 - - - C3 - - C3 G2 - - - A#2 - - A#2 F2 - - - A2 - - A2 E2 - - -',
    drums: 'K - H - S - H - K - H - S - H - K - H - S - H - K - H - S - H -',
  },
  space: {
    id: 'space',
    bpm: 120,
    lead: 'C5 G5 E6 G5 C5 G5 E6 G5 A4 E5 C6 E5 A4 E5 C6 E5 F4 C5 A5 C5 F4 C5 A5 C5 G4 D5 B5 D5 G4 D5 B5 D5',
    bass: 'C3 - - - - - - - A2 - - - - - - - F2 - - - - - - - G2 - - - - - - -',
    drums: 'K - H - K - H - K - H - K - H - K - H - K - H - K - H - K - H -',
  },
  fields2: {
    id: 'fields2',
    bpm: 120,
    lead: 'C5 - E5 - G5 - E5 - D5 - F5 - A5 - F5 - E5 - G5 - C6 - G5 - D5 - F5 - A5 - - -',
    bass: 'C3 - - - - - - - A2 - - - - - - - F2 - - - - - - - G2 - - - - - - -',
    drums: 'K - - H S - - H K - - H S - - H K - - H S - - H K - - H S - - H',
  },
  submarine2: {
    id: 'submarine2',
    bpm: 92,
    lead: 'E4 - - - A4 - - - C5 - - B4 - - A4 - - - E4 - - - G4 - - F4 - - E4 - - -',
    bass: 'A2 - - - - - - - F2 - - - - - - - C3 - - - - - - - E2 - - - - - - -',
    drums: 'K - - - - - - - - - - - S - - - K - - - - - - - - - - - S - - -',
  },
  castle2: {
    id: 'castle2',
    bpm: 116,
    lead: 'A4 - D5 - F5 - A5 - G5 - F5 - D5 - C#5 - D5 - F5 - A5 - D6 - C#6 - A5 - F5 - D5 -',
    bass: 'D3 - - D3 - - A2 - D3 - - D3 - - A2 - D3 - - D3 - - A2 - D3 - - D3 - - A2 -',
    drums: 'K - H - - - H - S - H - - - H - K - H - - - H - S - H - - - H -',
  },
  space2: {
    id: 'space2',
    bpm: 100,
    lead: 'G4 - - - - - - - D5 - - - - - - - B4 - - - - - - - E5 - - - - - - -',
    bass: 'G2 - - - - - - - D3 - - - - - - - B2 - - - - - - - E3 - - - - - - -',
    drums: 'K - - - H - - - - - - - H - - - K - - - H - - - - - - - H - - -',
  },
  caves: {
    id: 'caves',
    bpm: 88,
    lead: 'D4 - - F4 - - A4 - - - G4 - - F4 - - D4 - - C4 - - D4 - - - - - - - -',
    bass: 'D2 - - - - - - - A1 - - - - - - - F2 - - - - - - - C2 - - - - - - -',
    drums: 'K - - - - - - - - - - - S - - - K - - - - - - - - - - - S - - -',
  },
  caves2: {
    id: 'caves2',
    bpm: 84,
    lead: 'A3 - - - D4 - - - F4 - - E4 - - D4 - - - A3 - - - G3 - - - A3 - - - -',
    bass: 'D2 - - - - - - - - - - - A1 - - - F2 - - - - - - - - - - - C2 - - -',
    drums: 'K - - - - - - - - - - - - - - - K - - - - - - - - - - - - - - -',
  },
  battle: {
    id: 'battle',
    bpm: 156,
    lead: 'E5 E5 - E5 - C5 E5 - G5 - - - G4 - - - A4 - B4 - A#4 A4 - G4 E5 G5 A5 - F5 G5 - -',
    bass: 'E2 - E3 - E2 - E3 - C2 - C3 - C2 - C3 - A2 - A3 - A2 - A3 - B2 - B3 - B2 - B3 -',
    drums: 'K H H H S H H H K H H H S H H H K H H H S H H H K H H H S H H H',
  },
};
