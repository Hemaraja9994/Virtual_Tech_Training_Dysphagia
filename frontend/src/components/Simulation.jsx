import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Simulation — the gamified anti-gravity exercise.
 *
 * The orb's vertical position is driven by a physics loop:
 *   • gravity pulls it downward
 *   • smoothed swallow intensity pushes it upward
 *   • a Framer Motion spring smooths the rendered y position
 *
 * When the orb crosses ABOVE the target line we fire a "ripple" event:
 *   • a glowing aura around the orb
 *   • a soft ripple ring
 *   • a crisp "ding" via the WebAudio API
 *
 * Sizing: the simulation fills its container; we read the current rect with
 * a ResizeObserver so the physics work in pixel units that match the DOM.
 */
export default function Simulation({
  getIntensity,             // () => number in [0..1] (already smoothed)
  threshold = 0.2,
  running   = false,
  onSuccess               // optional: fired each time the orb crosses above target
}) {
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 480 });

  // Particle ripple list (DOM-rendered)
  const [ripples, setRipples] = useState([]);
  const ripIdRef = useRef(0);

  // Physics state lives in refs to avoid React re-renders per frame.
  const yRef  = useRef(420);
  const vyRef = useRef(0);
  const aboveRef = useRef(false);
  const lastTRef = useRef(performance.now());

  // Audio for the success "ding" — created lazily on first success because
  // browsers block AudioContext until a user gesture, and Start Session
  // counts as one.
  const audioRef = useRef(null);
  function ding() {
    try {
      if (!audioRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioRef.current = new AC();
      }
      const ac = audioRef.current;
      const t0 = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, t0);
      osc.frequency.exponentialRampToValueAtTime(1320, t0 + 0.12);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.30);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + 0.32);
    } catch { /* audio is best-effort */ }
  }

  // Track size of the stage
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(320, r.width), h: Math.max(280, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Motion values for buttery-smooth movement of the orb
  const yMV   = useMotionValue(size.h - 60);
  const ySpring = useSpring(yMV, { stiffness: 220, damping: 26, mass: 0.9 });

  // Glow intensity tracks how high the orb is above the target line
  const glow = useTransform(ySpring, (y) => {
    const targetY = size.h - threshold * size.h;
    const above = Math.max(0, targetY - y);
    return Math.min(1, above / Math.max(60, size.h * 0.35));
  });
  const glowOpacity = useTransform(glow, [0, 1], [0.25, 1]);
  const glowScale   = useTransform(glow, [0, 1], [1.0, 1.45]);

  // Pre-derived motion values used in style props (must be created at top level
  // so we don't violate Rules of Hooks).
  const haloY = useTransform(ySpring, (v) => v - 80);
  const orbY  = useTransform(ySpring, (v) => v - 28); // ORB_R

  // Physics loop
  useEffect(() => {
    let raf = 0;
    const TARGET_FRAC = threshold;

    // Re-baseline the orb when the stage resizes
    yRef.current = clamp(yRef.current, 30, size.h - 40);

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = clamp((now - lastTRef.current) / 1000, 0.001, 0.04);
      lastTRef.current = now;

      const intensity = clamp01(getIntensity?.() ?? 0);

      // gravity (px/s^2 scaled by stage height for consistency across sizes)
      const gravity = size.h * 1.55;
      // upward force from the swallow signal
      const lift    = intensity * size.h * 3.05;

      vyRef.current += (gravity - lift) * dt;
      vyRef.current  = clamp(vyRef.current, -size.h * 1.0, size.h * 1.6);
      yRef.current   = clamp(yRef.current + vyRef.current * dt, 32, size.h - 32);

      yMV.set(yRef.current);

      const targetY = size.h - TARGET_FRAC * size.h;
      const isAbove = yRef.current < targetY;
      if (isAbove && !aboveRef.current) {
        // Crossed above the line — celebrate
        spawnRipple();
        ding();
        onSuccess?.();
      }
      aboveRef.current = isAbove;
    };

    if (running) {
      lastTRef.current = performance.now();
      raf = requestAnimationFrame(tick);
    } else {
      // Reset on stop so the orb settles at the bottom
      vyRef.current = 0;
      yRef.current = size.h - 60;
      yMV.set(yRef.current);
      aboveRef.current = false;
    }

    return () => cancelAnimationFrame(raf);
  }, [running, size.h, threshold, onSuccess, getIntensity, yMV]);

  function spawnRipple() {
    const id = ++ripIdRef.current;
    setRipples((rs) => [...rs, { id }]);
    // Auto-clean after the CSS animation duration
    setTimeout(() => {
      setRipples((rs) => rs.filter((r) => r.id !== id));
    }, 1000);
  }

  // Visual constants
  const ORB_R = 28;
  const ORB_X = size.w / 2;
  const targetY = size.h - threshold * size.h;

  return (
    <div ref={wrapRef} className="relative w-full h-full overflow-hidden bg-stage-gradient">
      {/* Subtle grid backdrop for depth */}
      <div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(37,99,235,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(37,99,235,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px"
        }}
      />

      {/* Target line + label */}
      <div
        className="absolute left-0 right-0 border-t border-dashed border-emerald-400/70"
        style={{ top: targetY }}
      >
        <span className="absolute -top-3 left-4 text-[10px] font-semibold tracking-[0.18em] text-emerald-700 bg-white/90 px-2 py-0.5 rounded-full border border-emerald-200">
          TARGET · {(threshold * 100).toFixed(0)}%
        </span>
      </div>

      {/* Floor "rest line" */}
      <div className="absolute left-0 right-0 bottom-0 h-px bg-clinical-border" />

      {/* Glow halo (driven by Framer motion values) */}
      <motion.div
        className="absolute"
        style={{
          left: ORB_X - 80,
          y:    haloY,
          width: 160,
          height: 160,
          opacity: glowOpacity,
          scale: glowScale,
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(37,99,235,0.45) 0%, rgba(37,99,235,0.0) 60%)"
        }}
      />

      {/* Ripple rings */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full pointer-events-none animate-ripple"
          style={{
            left: ORB_X - 60,
            top:  targetY - 60,
            width: 120,
            height: 120,
            border: "2px solid rgba(16,185,129,0.55)",
            background: "rgba(16,185,129,0.10)"
          }}
        />
      ))}

      {/* The orb */}
      <motion.div
        className="absolute"
        style={{
          left: ORB_X - ORB_R,
          y:    orbY,
          width:  ORB_R * 2,
          height: ORB_R * 2,
          willChange: "transform"
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, #FFFFFF 0%, #BFDBFE 30%, #2563EB 70%, #1D4ED8 100%)",
            boxShadow:
              "0 8px 24px rgba(37,99,235,0.35), 0 0 0 1px rgba(255,255,255,0.4) inset"
          }}
        />
        {/* Specular highlight */}
        <div
          className="absolute rounded-full"
          style={{
            top:  ORB_R * 0.25,
            left: ORB_R * 0.35,
            width:  ORB_R * 0.55,
            height: ORB_R * 0.35,
            background: "rgba(255,255,255,0.65)",
            filter: "blur(3px)"
          }}
        />
      </motion.div>

      {/* HUD: live readouts */}
      <HUD running={running} threshold={threshold} getIntensity={getIntensity} />
    </div>
  );
}

/* ----------------------------------------------------------------------- */

function HUD({ running, threshold, getIntensity }) {
  // We update the small HUD counters at ~10Hz with React state — cheap and
  // keeps numbers readable without thrashing.
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!running) { setV(0); return; }
    const id = setInterval(() => setV(clamp01(getIntensity?.() ?? 0)), 100);
    return () => clearInterval(id);
  }, [running, getIntensity]);

  return (
    <div className="absolute top-4 left-4 glass-panel px-4 py-3 flex items-center gap-4">
      <Stat label="Intensity" value={v.toFixed(2)} accent={v >= threshold ? "ok" : "muted"} />
      <Divider />
      <Stat label="Target"    value={threshold.toFixed(2)} accent="brand" />
    </div>
  );
}

function Stat({ label, value, accent = "muted" }) {
  const color = {
    ok:     "text-signal-ok",
    brand:  "text-brand-600",
    muted:  "text-clinical-ink"
  }[accent];
  return (
    <div className="leading-tight">
      <div className="text-[10px] uppercase tracking-[0.15em] text-clinical-muted">{label}</div>
      <div className={`text-base font-semibold tabular-nums font-mono ${color}`}>{value}</div>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-clinical-border" />;
}

function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function clamp01(x)     { return x < 0 ? 0 : x > 1 ? 1 : x; }
