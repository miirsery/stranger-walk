import { describe, expect, it } from 'vitest';
import { validateContent } from '@core/content/validate';
import { gameContent } from './index';

describe('контент игры', () => {
  it('проходит проверку ссылочной целостности', () => {
    expect(validateContent(gameContent)).toEqual([]);
  });

  it('валидатор ловит битые ссылки и кривые карты', () => {
    const meadow = gameContent.levels.meadow;
    if (!meadow) throw new Error('нет уровня meadow');
    const broken = {
      ...gameContent,
      levels: {
        ...gameContent.levels,
        meadow: { ...meadow, rows: [...meadow.rows.slice(0, -1), '###'], npcs: [{ npcId: 'ghost', at: { x: 0, y: 0 } }] },
      },
    };
    const errors = validateContent(broken);
    expect(errors.some((error) => error.includes('«ghost»'))).toBe(true);
    expect(errors.some((error) => error.includes('имеет длину 3'))).toBe(true);
  });
});
