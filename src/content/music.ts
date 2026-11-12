import type { MusicTrackDef } from '@core/content/types';

/** Ноты через пробел, «-» — пауза, один токен = одна шестнадцатая. Партии зацикливаются. */
export const music: Record<string, MusicTrackDef> = {
  fields: {
    id: 'fields',
    bpm: 132,
    lead: 'E5 - G5 - C6 - G5 - A5 - G5 - E5 - - - F5 - A5 - C6 - A5 - G5 - E5 - D5 - - -',
    bass: 'C3 - - - G3 - - - A2 - - - E3 - - - F2 - - - C3 - - - G2 - - - G3 - - -',
  },
  submarine: {
    id: 'submarine',
    bpm: 100,
    lead: 'A4 - - C5 - - E5 - D5 - - C5 - - A4 - G4 - - B4 - - D5 - C5 - - B4 - - - -',
    bass: 'A2 - A2 - A2 - A2 - F2 - F2 - F2 - F2 - G2 - G2 - G2 - G2 - E2 - E2 - E2 - E2 -',
  },
  castle: {
    id: 'castle',
    bpm: 110,
    lead: 'D5 - F5 - A5 - - - G5 - F5 - E5 - - - F5 - A5 - D6 - - - C#6 - A5 - E5 - - -',
    bass: 'D3 - - D3 A2 - - - C3 - - C3 G2 - - - A#2 - - A#2 F2 - - - A2 - - A2 E2 - - -',
  },
  space: {
    id: 'space',
    bpm: 120,
    lead: 'C5 G5 E6 G5 C5 G5 E6 G5 A4 E5 C6 E5 A4 E5 C6 E5 F4 C5 A5 C5 F4 C5 A5 C5 G4 D5 B5 D5 G4 D5 B5 D5',
    bass: 'C3 - - - - - - - A2 - - - - - - - F2 - - - - - - - G2 - - - - - - -',
  },
  battle: {
    id: 'battle',
    bpm: 156,
    lead: 'E5 E5 - E5 - C5 E5 - G5 - - - G4 - - - A4 - B4 - A#4 A4 - G4 E5 G5 A5 - F5 G5 - -',
    bass: 'E2 - E3 - E2 - E3 - C2 - C3 - C2 - C3 - A2 - A3 - A2 - A3 - B2 - B3 - B2 - B3 -',
  },
};
