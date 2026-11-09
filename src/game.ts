// Pure game logic for "Monster Run" — no DOM/canvas access here so it can be unit tested directly.

export interface Vector2 {
  x: number;
  y: number;
}

export interface Player {
  position: Vector2;
  radius: number;
  speed: number;
}

export interface Monster {
  id: number;
  position: Vector2;
  radius: number;
  speed: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export const NO_INPUT: InputState = {
  up: false,
  down: false,
  left: false,
  right: false,
};

export interface GameConfig {
  playerSpeed: number;
  playerRadius: number;
  monsterRadius: number;
  baseMonsterSpeed: number;
  /** Fraction of base speed added per second survived, e.g. 0.05 = +5%/s. */
  monsterSpeedRampPerSecond: number;
  initialSpawnInterval: number;
  minSpawnInterval: number;
  spawnIntervalDecayPerSecond: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  playerSpeed: 220,
  playerRadius: 12,
  monsterRadius: 14,
  baseMonsterSpeed: 90,
  monsterSpeedRampPerSecond: 0.04,
  initialSpawnInterval: 2.2,
  minSpawnInterval: 0.5,
  spawnIntervalDecayPerSecond: 0.03,
};

export interface GameState {
  width: number;
  height: number;
  player: Player;
  monsters: Monster[];
  elapsed: number;
  score: number;
  gameOver: boolean;
  spawnTimer: number;
  spawnInterval: number;
  nextMonsterId: number;
}

export type RandomFn = () => number;

export function createInitialState(
  width: number,
  height: number,
  config: GameConfig = DEFAULT_CONFIG,
): GameState {
  return {
    width,
    height,
    player: {
      position: { x: width / 2, y: height / 2 },
      radius: config.playerRadius,
      speed: config.playerSpeed,
    },
    monsters: [],
    elapsed: 0,
    score: 0,
    gameOver: false,
    spawnTimer: 0,
    spawnInterval: config.initialSpawnInterval,
    nextMonsterId: 1,
  };
}

export function vectorLength(v: Vector2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function normalize(v: Vector2): Vector2 {
  const len = vectorLength(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function distance(a: Vector2, b: Vector2): number {
  return vectorLength({ x: a.x - b.x, y: a.y - b.y });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Moves the player according to input, clamped to the arena bounds. Mutates state. */
export function movePlayer(state: GameState, input: InputState, dt: number): void {
  if (state.gameOver) return;

  const direction: Vector2 = { x: 0, y: 0 };
  if (input.up) direction.y -= 1;
  if (input.down) direction.y += 1;
  if (input.left) direction.x -= 1;
  if (input.right) direction.x += 1;

  const normalized = normalize(direction);
  const { player } = state;

  player.position.x = clamp(
    player.position.x + normalized.x * player.speed * dt,
    player.radius,
    state.width - player.radius,
  );
  player.position.y = clamp(
    player.position.y + normalized.y * player.speed * dt,
    player.radius,
    state.height - player.radius,
  );
}

/** Moves every monster a step towards the player's current position. Mutates state. */
export function moveMonsters(state: GameState, dt: number, config: GameConfig = DEFAULT_CONFIG): void {
  if (state.gameOver) return;

  const speedMultiplier = 1 + state.elapsed * config.monsterSpeedRampPerSecond;

  for (const monster of state.monsters) {
    const toPlayer: Vector2 = {
      x: state.player.position.x - monster.position.x,
      y: state.player.position.y - monster.position.y,
    };
    const direction = normalize(toPlayer);
    const speed = monster.speed * speedMultiplier;
    monster.position.x += direction.x * speed * dt;
    monster.position.y += direction.y * speed * dt;
  }
}

/**
 * Picks a random point just outside the arena bounds, on one of the four edges.
 * `edgePick` and `alongEdge` are both expected to be in [0, 1).
 */
export function pickSpawnPosition(
  width: number,
  height: number,
  radius: number,
  edgePick: number,
  alongEdge: number,
): Vector2 {
  const edge = Math.floor(edgePick * 4); // 0 top, 1 right, 2 bottom, 3 left
  const offset = radius + 2;

  switch (edge) {
    case 0:
      return { x: alongEdge * width, y: -offset };
    case 1:
      return { x: width + offset, y: alongEdge * height };
    case 2:
      return { x: alongEdge * width, y: height + offset };
    default:
      return { x: -offset, y: alongEdge * height };
  }
}

/** Spawns a monster at the arena edge if the spawn timer has elapsed. Mutates state. */
export function spawnMonsterIfReady(
  state: GameState,
  dt: number,
  config: GameConfig = DEFAULT_CONFIG,
  rng: RandomFn = Math.random,
): void {
  if (state.gameOver) return;

  state.spawnTimer += dt;
  state.spawnInterval = Math.max(
    config.minSpawnInterval,
    config.initialSpawnInterval - state.elapsed * config.spawnIntervalDecayPerSecond,
  );

  if (state.spawnTimer < state.spawnInterval) return;

  state.spawnTimer = 0;
  const position = pickSpawnPosition(state.width, state.height, config.monsterRadius, rng(), rng());

  state.monsters.push({
    id: state.nextMonsterId++,
    position,
    radius: config.monsterRadius,
    speed: config.baseMonsterSpeed,
  });
}

/** Returns true (and flags gameOver) if any monster has touched the player. */
export function checkCollisions(state: GameState): boolean {
  for (const monster of state.monsters) {
    if (distance(state.player.position, monster.position) <= state.player.radius + monster.radius) {
      state.gameOver = true;
      return true;
    }
  }
  return false;
}

/** Advances the whole simulation by `dt` seconds. Mutates and returns `state`. */
export function updateGame(
  state: GameState,
  input: InputState,
  dt: number,
  config: GameConfig = DEFAULT_CONFIG,
  rng: RandomFn = Math.random,
): GameState {
  if (state.gameOver) return state;

  state.elapsed += dt;
  state.score = Math.floor(state.elapsed * 10);

  movePlayer(state, input, dt);
  moveMonsters(state, dt, config);
  spawnMonsterIfReady(state, dt, config, rng);
  checkCollisions(state);

  return state;
}
