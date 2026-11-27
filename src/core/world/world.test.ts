import { describe, expect, it } from 'vitest';
import { gameContent } from '@content/index';
import { ContentRegistry } from '../content/registry';
import { TILE_SIZE, tileCenter } from './tileMap';
import { WorldState } from './world';

const createWorld = (): WorldState => new WorldState(new ContentRegistry(gameContent), 'meadow');
const createSubmarine = (): WorldState => new WorldState(new ContentRegistry(gameContent), 'submarine');

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

  it('объекты уровня непроходимы и доступны для взаимодействия вблизи', () => {
    const world = createWorld();
    expect(world.objectAt(2, 7)?.id).toBe('welcome_sign');
    const above = tileCenter({ x: 2, y: 5 });
    world.player.x = above.x;
    world.player.y = above.y;
    run(world, 3000, 0, 1);
    expect(world.playerTile).toEqual({ x: 2, y: 6 });
    const target = world.findInteractable();
    expect(target?.kind === 'object' && target.object.id).toBe('welcome_sign');
  });

  it('из NPC и объекта выбирается ближайший', () => {
    const world = createWorld();
    const nearElder = tileCenter({ x: 5, y: 8 });
    world.player.x = nearElder.x;
    world.player.y = nearElder.y;
    expect(world.findInteractable()?.kind).toBe('npc');
  });

  it('закрытая дверь непроходима, открытая — пропускает', () => {
    const world = createWorld();
    expect(world.objectAt(20, 3)?.id).toBe('garden_door');
    expect(world.isDoorOpen('garden_door')).toBe(false);
    const below = tileCenter({ x: 20, y: 4 });
    world.player.x = below.x;
    world.player.y = below.y;
    run(world, 3000, 0, -1);
    expect(world.playerTile).toEqual({ x: 20, y: 4 });

    world.openDoor('garden_door');
    expect(world.isDoorOpen('garden_door')).toBe(true);
    run(world, 3000, 0, -1);
    // За дверью сразу стоит сундук — он тоже непроходим, открыть его можно от двери.
    expect(world.playerTile).toEqual({ x: 20, y: 3 });
    expect(world.findInteractable()).toMatchObject({ kind: 'object', object: { id: 'garden_chest' } });
  });

  it('загрузка уровня сбрасывает открытые двери до `setOpenDoors`', () => {
    const world = createWorld();
    world.openDoor('garden_door');
    world.loadLevel('meadow');
    expect(world.isDoorOpen('garden_door')).toBe(false);
    world.setOpenDoors(new Set(['garden_door']));
    expect(world.isDoorOpen('garden_door')).toBe(true);
  });

  it('NPC без маршрута не двигается', () => {
    const world = createWorld();
    const elder = tileCenter({ x: 5, y: 7 });
    run(world, 2000, 0, 0);
    expect(world.npcView(0)).toMatchObject({ x: elder.x, y: elder.y, moving: false });
  });

  it('NPC с маршрутом идёт туда-обратно между точками маршрута', () => {
    const world = createSubmarine();
    const engineer = 1;
    const start = tileCenter({ x: 25, y: 2 });
    const far = tileCenter({ x: 21, y: 2 });
    const near = (x: number, target: number): boolean => Math.abs(x - target) <= 2;
    expect(world.npcView(engineer)).toMatchObject({ x: start.x, y: start.y, moving: false });

    run(world, 1600, 0, 0);
    expect(near(world.npcView(engineer).x, far.x)).toBe(true);
    expect(world.npcView(engineer).facing).toBe('left');

    run(world, 1600, 0, 0);
    expect(near(world.npcView(engineer).x, start.x)).toBe(true);
    expect(world.npcView(engineer).facing).toBe('right');
  });

  it('патрулирующий NPC непроходим в своём текущем (а не стартовом) положении', () => {
    const world = createSubmarine();
    run(world, 800, 0, 0);
    const view = world.npcView(1);
    const tile = { x: Math.floor(view.x / TILE_SIZE), y: Math.floor(view.y / TILE_SIZE) };
    expect(world.npcAt(tile.x, tile.y)?.npcId).toBe('engineer');
    expect(world.npcAt(25, 2)).toBeUndefined();
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
