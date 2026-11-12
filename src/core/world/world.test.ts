import { describe, expect, it } from 'vitest';
import { gameContent } from '@content/index';
import { ContentRegistry } from '../content/registry';
import { TILE_SIZE, tileCenter } from './tileMap';
import { WorldState } from './world';

const createWorld = (): WorldState => new WorldState(new ContentRegistry(gameContent), 'meadow');

const run = (world: WorldState, ms: number, x: number, y: number): void => {
  for (let elapsed = 0; elapsed < ms; elapsed += 16) world.update(16, { x, y });
};

describe('WorldState', () => {
  it('ставит игрока в точку появления уровня', () => {
    const world = createWorld();
    expect(world.playerTile).toEqual({ x: 3, y: 9 });
    expect(world.map.width).toBe(28);
    expect(world.map.height).toBe(18);
  });

  it('двигает игрока и разворачивает его по направлению движения', () => {
    const world = createWorld();
    const startX = world.player.x;
    run(world, 500, 1, 0);
    expect(world.player.x).toBeGreaterThan(startX + 30);
    expect(world.player.facing).toBe('right');
    expect(world.player.moving).toBe(true);
    world.update(16, { x: 0, y: 0 });
    expect(world.player.moving).toBe(false);
  });

  it('не ускоряет движение по диагонали', () => {
    const straight = createWorld();
    const diagonal = createWorld();
    run(straight, 320, 1, 0);
    run(diagonal, 320, 1, 1);
    const start = tileCenter({ x: 3, y: 9 });
    const straightDistance = straight.player.x - start.x;
    const diagonalDistance = Math.hypot(diagonal.player.x - start.x, diagonal.player.y - start.y);
    expect(diagonalDistance).toBeCloseTo(straightDistance, 5);
  });

  it('не пускает сквозь стены и за пределы карты', () => {
    const world = createWorld();
    run(world, 5000, -1, 0);
    expect(world.player.x).toBeGreaterThanOrEqual(TILE_SIZE + 5);
    expect(world.player.x).toBeLessThan(TILE_SIZE + 7);
    expect(world.map.isSolid(-1, 0)).toBe(true);
    expect(world.map.isSolid(0, 99)).toBe(true);
  });

  it('NPC — препятствие, и с ним можно заговорить вблизи', () => {
    const world = createWorld();
    expect(world.findInteractableNpc()).toBeUndefined();
    const below = tileCenter({ x: 5, y: 9 });
    world.player.x = below.x;
    world.player.y = below.y;
    run(world, 3000, 0, -1);
    expect(world.playerTile).toEqual({ x: 5, y: 8 });
    expect(world.findInteractableNpc()?.npcId).toBe('elder');
  });

  it('находит портал под игроком и загружает другой уровень', () => {
    const world = createWorld();
    const portal = tileCenter({ x: 27, y: 8 });
    world.player.x = portal.x;
    world.player.y = portal.y;
    expect(world.portalUnderPlayer()?.toLevel).toBe('submarine');
    world.loadLevel('submarine', { x: 1, y: 2 });
    expect(world.level.id).toBe('submarine');
    expect(world.map.setting.id).toBe('submarine');
    expect(world.playerTile).toEqual({ x: 1, y: 2 });
  });
});
