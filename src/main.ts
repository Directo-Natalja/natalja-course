import {
  createInitialState,
  DEFAULT_CONFIG,
  updateGame,
  type GameState,
  type InputState,
} from "./game";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("Canvas 2D context is not available");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let state: GameState = createInitialState(WIDTH, HEIGHT);
let bestScore = 0;

const input: InputState = { up: false, down: false, left: false, right: false };

const KEY_MAP: Record<string, keyof InputState> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

window.addEventListener("keydown", (event) => {
  const key = KEY_MAP[event.code];
  if (key) {
    input[key] = true;
    event.preventDefault();
  }
  if (state.gameOver && event.code === "Space") {
    state = createInitialState(WIDTH, HEIGHT);
  }
});

window.addEventListener("keyup", (event) => {
  const key = KEY_MAP[event.code];
  if (key) {
    input[key] = false;
    event.preventDefault();
  }
});

function draw(): void {
  if (!ctx) return;

  ctx.fillStyle = "#10121a";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#4fd1c5";
  ctx.beginPath();
  ctx.arc(state.player.position.x, state.player.position.y, state.player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f56565";
  for (const monster of state.monsters) {
    ctx.beginPath();
    ctx.arc(monster.position.x, monster.position.y, monster.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "20px sans-serif";
  ctx.fillText(`Score: ${state.score}`, 16, 28);
  ctx.fillText(`Best: ${bestScore}`, 16, 52);

  if (state.gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#e2e8f0";
    ctx.textAlign = "center";
    ctx.font = "32px sans-serif";
    ctx.fillText("You got caught!", WIDTH / 2, HEIGHT / 2 - 20);
    ctx.font = "20px sans-serif";
    ctx.fillText(`Score: ${state.score}`, WIDTH / 2, HEIGHT / 2 + 16);
    ctx.fillText("Press Space to try again", WIDTH / 2, HEIGHT / 2 + 48);
    ctx.textAlign = "left";
  }
}

let lastTime = performance.now();

function loop(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 1 / 30);
  lastTime = now;

  if (!state.gameOver) {
    updateGame(state, input, dt, DEFAULT_CONFIG);
    bestScore = Math.max(bestScore, state.score);
  }

  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
