import { describe, expect, test } from "bun:test";
import {
  checkCollisions,
  createInitialState,
  DEFAULT_CONFIG,
  moveMonsters,
  movePlayer,
  normalize,
  NO_INPUT,
  pickSpawnPosition,
  spawnMonsterIfReady,
  updateGame,
  type GameConfig,
} from "../src/game";

const WIDTH = 800;
const HEIGHT = 600;

describe("createInitialState", () => {
  test("centers the player and starts with no monsters", () => {
    const state = createInitialState(WIDTH, HEIGHT);

    expect(state.player.position).toEqual({ x: WIDTH / 2, y: HEIGHT / 2 });
    expect(state.monsters).toEqual([]);
    expect(state.elapsed).toBe(0);
    expect(state.score).toBe(0);
    expect(state.gameOver).toBe(false);
  });
});

describe("normalize", () => {
  test("returns a unit vector preserving direction", () => {
    const result = normalize({ x: 3, y: 4 });
    expect(result.x).toBeCloseTo(0.6);
    expect(result.y).toBeCloseTo(0.8);
  });

  test("returns the zero vector unchanged", () => {
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe("movePlayer", () => {
  test("moves the player in the input direction", () => {
    const state = createInitialState(WIDTH, HEIGHT);
    const startX = state.player.position.x;

    movePlayer(state, { ...NO_INPUT, right: true }, 1);

    expect(state.player.position.x).toBeGreaterThan(startX);
  });

  test("clamps the player inside the arena bounds", () => {
    const state = createInitialState(WIDTH, HEIGHT);

    movePlayer(state, { ...NO_INPUT, left: true, up: true }, 100);

    expect(state.player.position.x).toBe(state.player.radius);
    expect(state.player.position.y).toBe(state.player.radius);
  });

  test("does nothing once the game is over", () => {
    const state = createInitialState(WIDTH, HEIGHT);
    state.gameOver = true;
    const before = { ...state.player.position };

    movePlayer(state, { ...NO_INPUT, right: true }, 1);

    expect(state.player.position).toEqual(before);
  });

  test("diagonal movement is not faster than axis-aligned movement", () => {
    const state = createInitialState(WIDTH, HEIGHT);
    const start = { ...state.player.position };

    movePlayer(state, { ...NO_INPUT, right: true, down: true }, 1);

    const dx = state.player.position.x - start.x;
    const dy = state.player.position.y - start.y;
    const traveled = Math.sqrt(dx * dx + dy * dy);

    expect(traveled).toBeCloseTo(state.player.speed, 0);
  });
});

describe("moveMonsters", () => {
  test("steers a monster towards the player", () => {
    const state = createInitialState(WIDTH, HEIGHT);
    state.monsters.push({ id: 1, position: { x: 0, y: 0 }, radius: 14, speed: 90 });

    const before = state.monsters[0]!.position.x;
    moveMonsters(state, 1, DEFAULT_CONFIG);

    expect(state.monsters[0]!.position.x).toBeGreaterThan(before);
  });

  test("speeds up over elapsed time", () => {
    const slow = createInitialState(WIDTH, HEIGHT);
    slow.monsters.push({ id: 1, position: { x: 0, y: 0 }, radius: 14, speed: 90 });

    const fast = createInitialState(WIDTH, HEIGHT);
    fast.elapsed = 50;
    fast.monsters.push({ id: 1, position: { x: 0, y: 0 }, radius: 14, speed: 90 });

    moveMonsters(slow, 1, DEFAULT_CONFIG);
    moveMonsters(fast, 1, DEFAULT_CONFIG);

    expect(fast.monsters[0]!.position.x).toBeGreaterThan(slow.monsters[0]!.position.x);
  });
});

describe("pickSpawnPosition", () => {
  test("picks each edge based on the first random value", () => {
    const radius = 14;
    const top = pickSpawnPosition(WIDTH, HEIGHT, radius, 0, 0.5);
    const right = pickSpawnPosition(WIDTH, HEIGHT, radius, 0.26, 0.5);
    const bottom = pickSpawnPosition(WIDTH, HEIGHT, radius, 0.51, 0.5);
    const left = pickSpawnPosition(WIDTH, HEIGHT, radius, 0.76, 0.5);

    expect(top.y).toBeLessThan(0);
    expect(right.x).toBeGreaterThan(WIDTH);
    expect(bottom.y).toBeGreaterThan(HEIGHT);
    expect(left.x).toBeLessThan(0);
  });
});

describe("spawnMonsterIfReady", () => {
  test("does not spawn before the interval elapses", () => {
    const state = createInitialState(WIDTH, HEIGHT);
    spawnMonsterIfReady(state, DEFAULT_CONFIG.initialSpawnInterval - 0.1, DEFAULT_CONFIG, () => 0);

    expect(state.monsters).toHaveLength(0);
  });

  test("spawns exactly one monster once the interval elapses and resets the timer", () => {
    const state = createInitialState(WIDTH, HEIGHT);
    spawnMonsterIfReady(state, DEFAULT_CONFIG.initialSpawnInterval, DEFAULT_CONFIG, () => 0);

    expect(state.monsters).toHaveLength(1);
    expect(state.spawnTimer).toBe(0);
  });

  test("spawn interval decays towards the configured minimum", () => {
    const config: GameConfig = DEFAULT_CONFIG;
    const state = createInitialState(WIDTH, HEIGHT);
    state.elapsed = 1000;

    spawnMonsterIfReady(state, 0, config, () => 0);

    expect(state.spawnInterval).toBe(config.minSpawnInterval);
  });
});

describe("checkCollisions", () => {
  test("flags game over when a monster touches the player", () => {
    const state = createInitialState(WIDTH, HEIGHT);
    state.monsters.push({ id: 1, position: { ...state.player.position }, radius: 14, speed: 90 });

    const result = checkCollisions(state);

    expect(result).toBe(true);
    expect(state.gameOver).toBe(true);
  });

  test("leaves the game running when monsters are far away", () => {
    const state = createInitialState(WIDTH, HEIGHT);
    state.monsters.push({ id: 1, position: { x: 0, y: 0 }, radius: 14, speed: 90 });

    const result = checkCollisions(state);

    expect(result).toBe(false);
    expect(state.gameOver).toBe(false);
  });
});

describe("updateGame", () => {
  test("increases score and elapsed time over a tick", () => {
    const state = createInitialState(WIDTH, HEIGHT);
    updateGame(state, NO_INPUT, 1, DEFAULT_CONFIG, () => 1);

    expect(state.elapsed).toBeCloseTo(1);
    expect(state.score).toBe(10);
  });

  test("freezes the state once the game is over", () => {
    const state = createInitialState(WIDTH, HEIGHT);
    state.monsters.push({ id: 1, position: { ...state.player.position }, radius: 14, speed: 90 });
    updateGame(state, NO_INPUT, 1, DEFAULT_CONFIG, () => 1);

    expect(state.gameOver).toBe(true);
    const scoreAtGameOver = state.score;

    updateGame(state, { ...NO_INPUT, right: true }, 1, DEFAULT_CONFIG, () => 1);

    expect(state.score).toBe(scoreAtGameOver);
  });

  test("ends the game once a monster catches the player over many ticks", () => {
    const state = createInitialState(WIDTH, HEIGHT);
    // rng = 0 always spawns at the top edge, straight above the player's x position.
    for (let i = 0; i < 400 && !state.gameOver; i++) {
      updateGame(state, NO_INPUT, 0.1, DEFAULT_CONFIG, () => 0);
    }

    expect(state.gameOver).toBe(true);
  });
});
