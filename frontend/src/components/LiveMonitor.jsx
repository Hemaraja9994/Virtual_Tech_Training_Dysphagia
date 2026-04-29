import { useEffect, useMemo, useRef } from "react";

/**
 * LiveMonitor — ICU-style scrolling telemetry trace.
 *
 * We hand-roll the renderer on a 2D Canvas instead of using recharts.
 * Reasons:
 *  • Streaming at 60Hz with React reconciliation is wasteful — Canvas
 *    is the right primitive for a continuously sliding trace.
 *  • We want gradient fill, glow, target band, and a leading "head dot",
 *    all of which are awkward to compose in recharts.
 *
 * Props:
 *   getSignal()  — sync getter returning the smoothed [0..1] value.
 *                  Polled at requestAnimationFrame cadence (no React re-renders).
 *   threshold    — target line in [0..1].
 *   running      — when false, the trace freezes.
 *   tickHz       — sampling rate fed into the buffer (default 60).
 *   windowSec    — visible time window (default 8s).
 *   label        — caption shown bottom-left (e.g. "sEMG · uV").
 */
export default function LiveMonitor({
  getSignal,
  threshold = 0.2,
  running   = false,
  tickHz    = 60,
  windowSec = 8,
  label     = "Signal"
}) {
  const wrapRef   = useRef(null);
  const canvasRef = useRef(null);
  const headRef   = useRef(null);

  // Ring buffer is held in a ref so re-renders don't reset it.
  const bufRef = useRef(null);
  if (!bufRef.current) {
    const size = Math.max(60, Math.ceil(tickHz * windowSec));
    bufRef.current = { data: new Float32Array(size), head: 0, size };
  }

  // Resize canvas to its CSS box at devicePixelRatio for crisp lines.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;

    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const { clientWidth: w, clientHeight: h } = wrap;
      canvas.width  = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width  = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // Main render loop. We drive sampling and drawing from the same RAF tick
  // so the trace scrolls smoothly with no React state churn.
  useEffect(() => {
    let raf = 0;
    let lastSample = performance.now();
    const sampleEveryMs = 1000 / tickHz;

    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const head   = headRef.current;
      if (!canvas) return;

      const buf = bufRef.current;

      // Sample the signal at tickHz, regardless of frame rate.
      if (running && now - lastSample >= sampleEveryMs) {
        const v = clamp01(getSignal?.() ?? 0);
        buf.data[buf.head] = v;
        buf.head = (buf.head + 1) % buf.size;
        lastSample = now;
      }

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, w, h);

      // ---- Threshold band (clinical reference line + soft band)
      const thrY = h - threshold * h;
      ctx.fillStyle = "rgba(16, 185, 129, 0.06)";
      ctx.fillRect(0, 0, w, thrY);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.55)";
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, thrY);
      ctx.lineTo(w, thrY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Threshold label
      ctx.font = "600 10px Inter, sans-serif";
      ctx.fillStyle = "#047857";
      ctx.fillText(`TARGET ${threshold.toFixed(2)}`, 8, Math.max(12, thrY - 6));

      // ---- Trace: oldest → newest, left → right.
      const N = buf.size;
      const start = buf.head; // oldest sample index
      const stride = w / (N - 1);

      // Gradient fill below the line
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0,   "rgba(14, 165, 233, 0.30)");
      grad.addColorStop(1,   "rgba(14, 165, 233, 0.00)");

      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < N; i++) {
        const idx = (start + i) % N;
        const v = buf.data[idx] ?? 0;
        const x = i * stride;
        const y = h - v * h;
        if (i === 0) ctx.lineTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Stroke
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const idx = (start + i) % N;
        const v = buf.data[idx] ?? 0;
        const x = i * stride;
        const y = h - v * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#0EA5E9";
      ctx.shadowColor = "rgba(14, 165, 233, 0.55)";
      ctx.shadowBlur  = 6;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      // ---- Leading head indicator
      const lastIdx = (start + N - 1) % N;
      const lastV = buf.data[lastIdx] ?? 0;
      const headX = w - 1;
      const headY = h - lastV * h;
      if (head) {
        head.style.transform = `translate(${headX - 6}px, ${headY - 6}px)`;
        head.dataset.above = String(lastV >= threshold);
      }

      // ---- Footer label
      ctx.font = "600 11px Inter, sans-serif";
      ctx.fillStyle = "#64748B";
      ctx.fillText(label, 8, h - 8);
      ctx.fillStyle = "#0EA5E9";
      ctx.fillText(`${(lastV * 100).toFixed(0)}%`, w - 36, h - 8);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [getSignal, threshold, running, tickHz, label]);

  // Y-axis ticks rendered in DOM so they stay crisp at any zoom
  const ticks = useMemo(() => [0, 0.25, 0.5, 0.75, 1], []);

  return (
    <div ref={wrapRef} className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Y-axis */}
      <div className="absolute right-2 top-2 bottom-2 flex flex-col justify-between text-[10px] text-clinical-muted font-mono pointer-events-none">
        {ticks.slice().reverse().map((t) => (
          <span key={t}>{t.toFixed(2)}</span>
        ))}
      </div>

      {/* Live "head" dot */}
      <div
        ref={headRef}
        className="absolute top-0 left-0 h-3 w-3 rounded-full pointer-events-none transition-colors"
        style={{
          background: "radial-gradient(circle, #0EA5E9 0%, rgba(14,165,233,0) 70%)",
          boxShadow:  "0 0 0 2px rgba(14,165,233,0.18)"
        }}
      />

      {/* No-signal overlay */}
      {!running && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <span className="text-[0.72rem] uppercase tracking-[0.18em] text-clinical-muted bg-white/70 px-3 py-1 rounded-full border border-clinical-border">
            Standby — start a session to stream
          </span>
        </div>
      )}
    </div>
  );
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
