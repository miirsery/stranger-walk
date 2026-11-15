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
/** Скорость патрулирующих NPC, в пикселях в секунду — медленнее игрока, чтобы не обгонять. */
const NPC_PATROL_SPEED = 40;

/** Текущее положение патрулирующего (или неподвижного) NPC — отдельно от его описания в контенте. */
interface NpcRuntime {
  x: number;
  y: number;
  facing: Facing;
  moving: boolean;
  /** Индекс точки маршрута (`[at, ...patrol]`), к которой сейчас идёт NPC. */
  targetIndex: number;
  direction: 1 | -1;
}

/** Положение и взгляд NPC для рендера. */
export interface NpcView {
  x: number;
  y: number;
  facing: Facing;
  moving: boolean;
}

/** Состояние мира: текущий уровень, игрок и NPC. Никакого рендера — только правила. */
export class WorldState {
  level: LevelDef;
  map: TileMap;
  readonly player: PlayerState;
  /** id открытых дверей текущего уровня; сбрасывается при каждой загрузке уровня через `setOpenDoors`. */
  private openDoors = new Set<string>();
  /** Положение NPC текущего уровня, по индексу в `level.npcs`. */
  private npcRuntimes: NpcRuntime[] = [];

  constructor(
    private readonly content: ContentRegistry,
    levelId: string,
  ) {
    this.level = content.level(levelId);
    this.map = new TileMap(this.level, content.setting(this.level.setting));
    const spawn = tileCenter(this.level.spawn);
    this.player = { x: spawn.x, y: spawn.y, facing: 'down', moving: false };
    this.npcRuntimes = this.buildNpcRuntimes();
  }

  loadLevel(levelId: string, spawn?: Point): void {
    this.level = this.content.level(levelId);
    this.map = new TileMap(this.level, this.content.setting(this.level.setting));
    const at = tileCenter(spawn ?? this.level.spawn);
    this.player.x = at.x;
    this.player.y = at.y;
    this.player.moving = false;
    this.openDoors = new Set();
    this.npcRuntimes = this.buildNpcRuntimes();
  }

  /** Отмечает, какие двери текущего уровня уже открыты (по id объекта). Вызывается сессией после загрузки уровня. */
  setOpenDoors(ids: ReadonlySet<string>): void {
    this.openDoors = new Set(ids);
  }

  /** Открывает одну дверь текущего уровня — сразу, без перезагрузки всего набора. */
  openDoor(objectId: string): void {
    this.openDoors.add(objectId);
  }

  isDoorOpen(objectId: string): boolean {
    return this.openDoors.has(objectId);
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

  /** Сдвигает игрока с учётом столкновений и продвигает патрулирующих NPC. */
  update(dtMs: number, input: MoveInput): void {
    this.updateNpcs(dtMs);

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
    return this.level.npcs.find((_, index) => {
      const runtime = this.runtimeAt(index);
      return pixelToTile(runtime.x) === tx && pixelToTile(runtime.y) === ty;
    });
  }

  /** Текущее положение и взгляд NPC по индексу в `level.npcs` — для рендера. */
  npcView(index: number): NpcView {
    const { x, y, facing, moving } = this.runtimeAt(index);
    return { x, y, facing, moving };
  }

  objectAt(tx: number, ty: number): WorldObjectDef | undefined {
    return this.level.objects?.find((object) => object.at.x === tx && object.at.y === ty);
  }

  /** Ближайшее в радиусе взаимодействия: NPC или объект. Дверь — не объект взаимодействия, её открывает рычаг. */
  findInteractable(): Interactable | undefined {
    const candidates: { item: Interactable; center: Point }[] = [
      ...this.level.npcs.map((npc, index) => ({ item: { kind: 'npc', npc } as const, center: this.runtimeAt(index) })),
      ...(this.level.objects ?? [])
        .filter((object) => object.type !== 'door')
        .map((object) => ({ item: { kind: 'object', object } as const, center: tileCenter(object.at) })),
    ];
    let best: Interactable | undefined;
    let bestDistance = INTERACT_RANGE;
    for (const { item, center } of candidates) {
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
    this.level.npcs.forEach((npc, index) => {
      const center = this.runtimeAt(index);
      const distance = Math.hypot(center.x - this.player.x, center.y - this.player.y);
      if (distance <= bestDistance) {
        best = npc;
        bestDistance = distance;
      }
    });
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
        if (this.map.isSolid(tx, ty) || this.npcAt(tx, ty)) return true;
        const object = this.objectAt(tx, ty);
        if (object && this.blocksMovement(object)) return true;
      }
    }
    return false;
  }

  /** Открытая дверь пропускает; остальные объекты (табличка, сундук, рычаг) непроходимы, как и раньше. */
  private blocksMovement(object: WorldObjectDef): boolean {
    return object.type !== 'door' || !this.openDoors.has(object.id);
  }

  /** Точки маршрута NPC: точка появления и (если есть) места патруля. Без патруля — NPC неподвижен. */
  private routeOf(placement: NpcPlacement): Point[] {
    return [placement.at, ...(placement.patrol ?? [])];
  }

  /** По invariant'у размер и порядок совпадают с `level.npcs` — доступ всегда в пределах. */
  private runtimeAt(index: number): NpcRuntime {
    return this.npcRuntimes[index] as NpcRuntime;
  }

  private buildNpcRuntimes(): NpcRuntime[] {
    return this.level.npcs.map((placement) => {
      const start = tileCenter(placement.at);
      return { x: start.x, y: start.y, facing: 'down', moving: false, targetIndex: 1, direction: 1 };
    });
  }

  /** Двигает патрулирующих NPC к следующей точке маршрута; на концах маршрута разворачивает их назад. */
  private updateNpcs(dtMs: number): void {
    const step = (NPC_PATROL_SPEED * dtMs) / 1000;
    this.level.npcs.forEach((placement, index) => {
      const route = this.routeOf(placement);
      if (route.length < 2) return;
      const runtime = this.runtimeAt(index);
      const target = tileCenter(route[runtime.targetIndex] as Point);
      const dx = target.x - runtime.x;
      const dy = target.y - runtime.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= step) {
        runtime.x = target.x;
        runtime.y = target.y;
        runtime.moving = false;
        let next = runtime.targetIndex + runtime.direction;
        if (next < 0 || next >= route.length) {
          runtime.direction = (runtime.direction * -1) as 1 | -1;
          next = runtime.targetIndex + runtime.direction;
        }
        runtime.targetIndex = next;
        return;
      }
      runtime.x += (dx / distance) * step;
      runtime.y += (dy / distance) * step;
      runtime.moving = true;
      if (Math.abs(dx) > Math.abs(dy)) runtime.facing = dx > 0 ? 'right' : 'left';
      else runtime.facing = dy > 0 ? 'down' : 'up';
    });
  }
}
