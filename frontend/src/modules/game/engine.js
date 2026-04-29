const GAME_WIDTH = 920;
const GAME_HEIGHT = 460;
const TARGET_LINE_Y = 145;
const GRAVITY = 760;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createGameEngine(canvasEl, getIntensity, onSuccess) {
  let raf = null;
  let lastTime = performance.now();
  const state = { y: GAME_HEIGHT - 80, vy: 0, aboveTarget: false };

  function drawFrame(time) {
    raf = requestAnimationFrame(drawFrame);
    const dt = clamp((time - lastTime) / 1000, 0.001, 0.033);
    lastTime = time;
    const ctx = canvasEl.getContext("2d");

    const intensity = getIntensity();
    state.vy += GRAVITY * dt;
    state.vy -= intensity * 1450 * dt;
    state.vy = clamp(state.vy, -480, 760);
    state.y = clamp(state.y + state.vy * dt, 30, GAME_HEIGHT - 44);

    const isAboveTarget = state.y < TARGET_LINE_Y;
    if (isAboveTarget && !state.aboveTarget) onSuccess();
    state.aboveTarget = isAboveTarget;

    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(0, TARGET_LINE_Y);
    ctx.lineTo(GAME_WIDTH, TARGET_LINE_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    const grad = ctx.createRadialGradient(460, state.y, 5, 460, state.y, 26);
    grad.addColorStop(0, "#fde68a");
    grad.addColorStop(1, "#f59e0b");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(460, state.y, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 20px Arial";
    ctx.fillText(`Intensity: ${intensity.toFixed(2)}`, 20, 32);
  }

  return {
    start() {
      if (!raf) raf = requestAnimationFrame(drawFrame);
    },
    stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    },
    dimensions: { width: GAME_WIDTH, height: GAME_HEIGHT }
  };
}
