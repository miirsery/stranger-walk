import type { ContentRegistry } from '../content/registry';
import type { LevelDef, NpcPlacement, Point, PortalDef, WorldObjectDef } from '../content/types';
import { pixelToTile, TILE_SIZE, tileCenter, TileMap } from './tileMap';

export type Facing = 'up' | 'down' | 'left' | 'right';

/** Ввод движения, не зависящий от устройства: клавиатура, тач-джойстик, геймпад. */
export interface MoveInput {
  /** -1..1 */
  x: number;
  /** -1..1 */
  y: number;
}

/** То, с чем игрок может взаимодействовать: персонаж или объект уровня. */
export type Interactable = { kind: 'npc'; npc: NpcPlacement } | { kind: 'object'; object: WorldObjectDef };

export interface PlayerState {
  /** Центр персонажа в пикселях мира. */
  x: number;
  y: number;
  facing: Facing;
  moving: boolean;
}

/** Половина стороны хитбокса игрока. Меньше половины тайла, чтобы проходить в проёмы шириной в тайл. */
const PLAYER_HALF = 5;
/** Дистанция между центрами, на которой можно заговорить с NPC. */
const INTERACT_RANGE = TILE_SIZE * 1.4;

/** Состояние мира: текущий уровень и игрок. Никакого рендера — только правила. */
export class WorldState {
  level: LevelDef;
  map: TileMap;
  readonly player: PlayerState;

  constructor(
    private readonly content: ContentRegistry,
    levelId: string,
  ) {
    this.level = content.level(levelId);
    this.map = new TileMap(this.level, content.setting(this.level.setting));
    const spawn = tileCenter(this.level.spawn);
    this.player = { x: spawn.x, y: spawn.y, facing: 'down', moving: false };
  }

  loadLevel(levelId: string, spawn?: Point): void {
    this.level = this.content.level(levelId);
    this.map = new TileMap(this.level, this.content.setting(this.level.setting));
    const at = tileCenter(spawn ?? this.level.spawn);
    this.player.x = at.x;
    this.player.y = at.y;
    this.player.moving = false;
  }

  /** Ставит игрока в точку (в пикселях). Возвращает false и ничего не меняет, если там стена. */
  placePlayer(x: number, y: number, facing: Facing): boolean {
    if (this.collides(x, y)) return false;
    this.player.x = x;
    this.player.y = y;
    this.player.facing = facing;
    return true;
  }

  get playerTile(): Point {
    return { x: pixelToTile(this.player.x), y: pixelToTile(this.player.y) };
  }

  /** Сдвигает игрока с учётом столкновений. Оси обрабатываются раздельно — получается скольжение вдоль стен. */
  update(dtMs: number, input: MoveInput): void {
    const length = Math.hypot(input.x, input.y);
    const player = this.player;
    player.moving = length > 0.01;
    if (!player.moving) return;

    const scale = length > 1 ? 1 / length : 1;
    const distance = (this.content.data.player.speed * dtMs) / 1000;
    const dx = input.x * scale * distance;
    const dy = input.y * scale * distance;

    if (Math.abs(input.x) > Math.abs(input.y)) player.facing = input.x > 0 ? 'right' : 'left';
    else player.facing = input.y > 0 ? 'down' : 'up';

    if (dx !== 0 && !this.collides(player.x + dx, player.y)) player.x += dx;
    if (dy !== 0 && !this.collides(player.x, player.y + dy)) player.y += dy;
  }

  npcAt(tx: number, ty: number): NpcPlacement | undefined {
    return this.level.npcs.find((npc) => npc.at.x === tx && npc.at.y === ty);
  }

  objectAt(tx: number, ty: number): WorldObjectDef | undefined {
    return this.level.objects?.find((object) => object.at.x === tx && object.at.y === ty);
  }

  /** Ближайшее в радиусе взаимодействия: NPC или объект. */
  findInteractable(): Interactable | undefined {
    const candidates: { item: Interactable; at: Point }[] = [
      ...this.level.npcs.map((npc) => ({ item: { kind: 'npc', npc } as const, at: npc.at })),
      ...(this.level.objects ?? []).map((object) => ({ item: { kind: 'object', object } as const, at: object.at })),
    ];
    let best: Interactable | undefined;
    let bestDistance = INTERACT_RANGE;
    for (const { item, at } of candidates) {
      const center = tileCenter(at);
      const distance = Math.hypot(center.x - this.player.x, center.y - this.player.y);
      if (distance <= bestDistance) {
        best = item;
        bestDistance = distance;
      }
    }
    return best;
  }

  /** Ближайший NPC в радиусе взаимодействия. */
  findInteractableNpc(): NpcPlacement | undefined {
    let best: NpcPlacement | undefined;
    let bestDistance = INTERACT_RANGE;
    for (const npc of this.level.npcs) {
      const center = tileCenter(npc.at);
      const distance = Math.hypot(center.x - this.player.x, center.y - this.player.y);
      if (distance <= bestDistance) {
        best = npc;
        bestDistance = distance;
      }
    }
    return best;
  }

  portalUnderPlayer(): PortalDef | undefined {
    const tile = this.playerTile;
    return this.level.portals.find((portal) => portal.at.x === tile.x && portal.at.y === tile.y);
  }

  private collides(x: number, y: number): boolean {
    const left = pixelToTile(x - PLAYER_HALF);
    const right = pixelToTile(x + PLAYER_HALF - 0.001);
    const top = pixelToTile(y - PLAYER_HALF);
    const bottom = pixelToTile(y + PLAYER_HALF - 0.001);
    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (this.map.isSolid(tx, ty) || this.npcAt(tx, ty) || this.objectAt(tx, ty)) return true;
      }
    }
    return false;
  }
}
