import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Simulation — Live Swallow Trainer.
 *
 * A pseudo-3D chamber with depth, ambient particles, a motion-trail orb, and a
 * mirrored ground reflection. The orb's vertical position is driven by a
 * physics loop:
 *   • gravity pulls down
 *   • smoothed swallow intensity pushes up
 *   • a Framer Motion spring smooths the rendered y position
 *
 * When the orb crosses ABOVE the target line we fire a "ripple" event:
 *   • a glowing aura around the orb
 *   • a soft expanding ring
 *   • a crisp "ding" via the WebAudio API
 */
export default function Simulation({
  getIntensity,
  threshold = 0.2,
  running   = false,
  onSuccess
}) {
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 520 });

  // Canvas overlay used for ambient particles + motion trail (cheaper than DOM)
  const fxCanvasRef = useRef(null);

  // Ripple list (DOM-rendered)
  const [ripples, setRipples] = useState([]);
  const ripIdRef = useRef(0);

  // Physics state (refs to avoid React re-renders per frame)
  const yRef     = useRef(420);
  const vyRef    = useRef(0);
  const aboveRef = useRef(false);
  const lastTRef = useRef(performance.now());

  // Motion trail buffer — last N orb positions, drawn with fading alpha.
  const trailRef = useRef([]);

  // Ambient floating particles (depth field). Created once and recycled.
  const particlesRef = useRef(null);
  if (!particlesRef.current) {
    particlesRef.current = makeParticles(28);
  }

  // Audio (lazy — first user gesture creates the AudioContext)
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
      gain.gain.exponentialRampToValueAtTime(0.20, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + 0.34);
    } catch { /* best effort */ }
  }

  // Track stage size + sync canvas DPR
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const w = Math.max(360, r.width);
      const h = Math.max(320, r.height);
      setSize({ w, h });
      const c = fxCanvasRef.current;
      if (c) {
        const dpr = window.devicePixelRatio || 1;
        c.width  = Math.floor(w * dpr);
        c.height = Math.floor(h * dpr);
        c.style.width  = `${w}px`;
        c.style.height = `${h}px`;
        c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Motion values
  const yMV   = useMotionValue(size.h - 70);
  const ySpring = useSpring(yMV, { stiffness: 220, damping: 26, mass: 0.9 });

  // Glow intensity — how high the orb is above the target line
  const glow = useTransform(ySpring, (y) => {
    const targetY = size.h - threshold * size.h;
    const above = Math.max(0, targetY - y);
    return Math.min(1, above / Math.max(60, size.h * 0.35));
  });
  const glowOpacity = useTransform(glow, [0, 1], [0.30, 1]);
  const glowScale   = useTransform(glow, [0, 1], [1.0, 1.55]);

  // Orb derivative motion values (top-level for hooks rules)
  const ORB_R = 34;
  const haloY    = useTransform(ySpring, (v) => v - 96);
  const orbY     = useTransform(ySpring, (v) => v - ORB_R);
  const reflectY = useTransform(ySpring, (v) => (size.h - 0) + (size.h - v) * 0.05); // settles below floor

  // Physics + canvas FX loop
  useEffect(() => {
    let raf = 0;

    yRef.current = clamp(yRef.current, 30, size.h - 40);

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = clamp((now - lastTRef.current) / 1000, 0.001, 0.04);
      lastTRef.current = now;

      const intensity = clamp01(getIntensity?.() ?? 0);

      if (running) {
        // gravity scaled by stage height for size-independence
        const gravity = size.h * 1.55;
        const lift    = intensity * size.h * 3.05;

        vyRef.current += (gravity - lift) * dt;
        vyRef.current  = clamp(vyRef.current, -size.h * 1.0, size.h * 1.6);
        yRef.current   = clamp(yRef.current + vyRef.current * dt, 32, size.h - 32);

        yMV.set(yRef.current);

        const targetY = size.h - threshold * size.h;
        const isAbove = yRef.current < targetY;
        if (isAbove && !aboveRef.current) {
          spawnRipple();
          ding();
          onSuccess?.();
        }
        aboveRef.current = isAbove;

        // Trail
        trailRef.current.push({ y: yRef.current, t: now });
        if (trailRef.current.length > 18) trailRef.current.shift();
      } else {
        // Idle breathing — orb rests near floor with a gentle bob.
        const breathe = Math.sin(now / 700) * 4;
        yRef.current = size.h - 70 + breathe;
        yMV.set(yRef.current);
        trailRef.current.length = 0;
      }

      // ---- Ambient particle motion + canvas FX render
      const c = fxCanvasRef.current;
      if (c) {
        const ctx = c.getContext("2d");
        const w = c.clientWidth;
        const h = c.clientHeight;
        ctx.clearRect(0, 0, w, h);

        // Soft vignette (atmospheric depth)
        const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.15, w / 2, h / 2, Math.max(w, h) * 0.7);
        vg.addColorStop(0, "rgba(239, 246, 255, 0.0)");
        vg.addColorStop(1, "rgba(15, 23, 42, 0.10)");
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);

        // Particles
        const ps = particlesRef.current;
        for (let i = 0; i < ps.length; i++) {
          const p = ps[i];
          p.y += p.vy * dt;
          p.x += p.vx * dt;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
          const px = p.x;
          const py = p.y;
          const r  = p.r * (running ? 1 : 0.7);
          const a  = p.a * (running ? 1 : 0.55);
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(37, 99, 235, ${a})`;
          ctx.fill();
        }

        // Motion trail of orb (small to large fading dots)
        const cx = w / 2;
        const trail = trailRef.current;
        for (let i = 0; i < trail.length; i++) {
          const tp = trail[i];
          const age = (trail.length - i) / trail.length;
          const r = ORB_R * (1 - age * 0.7);
          ctx.beginPath();
          ctx.arc(cx, tp.y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(37, 99, 235, ${0.10 * (1 - age)})`;
          ctx.fill();
        }

        // Ground bloom (soft glow at the bottom)
        const groundGrad = ctx.createLinearGradient(0, h - 80, 0, h);
        groundGrad.addColorStop(0, "rgba(37, 99, 235, 0.0)");
        groundGrad.addColorStop(1, "rgba(37, 99, 235, 0.10)");
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, h - 80, w, 80);
      }
    };

    lastTRef.current = performance.now();
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, size.h, threshold, onSuccess, getIntensity, yMV]);

  function spawnRipple() {
    const id = ++ripIdRef.current;
    setRipples((rs) => [...rs, { id }]);
    setTimeout(() => setRipples((rs) => rs.filter((r) => r.id !== id)), 1000);
  }

  // Layout constants
  const ORB_X  = size.w / 2;
  const targetY = size.h - threshold * size.h;

  return (
    <div ref={wrapRef} className="relative w-full h-full overflow-hidden bg-stage-gradient">
      {/* Inner bezel — gives the chamber a device-like depth */}
      <div className="pointer-events-none absolute inset-2 rounded-clinical border border-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-40px_60px_rgba(15,23,42,0.06)]" />

      {/* Subtle perspective grid */}
      <div
        className="absolute inset-0 opacity-70 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(37,99,235,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(37,99,235,0.04) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 50%, rgba(0,0,0,0.2) 100%)"
        }}
      />

      {/* FX canvas: particles + motion trail */}
      <canvas
        ref={fxCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Target band */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: targetY,
          height: 0,
          borderTop: "1.5px dashed rgba(16,185,129,0.7)"
        }}
      >
        <span className="absolute -top-3.5 left-4 text-[11px] font-semibold tracking-[0.18em] text-emerald-700 bg-white/95 px-2.5 py-1 rounded-full border border-emerald-200 shadow-clinical-sm">
          TARGET · {(threshold * 100).toFixed(0)}%
        </span>
        <span className="absolute -top-3.5 right-4 text-[11px] font-semibold tracking-[0.18em] text-emerald-700 bg-white/95 px-2.5 py-1 rounded-full border border-emerald-200 shadow-clinical-sm">
          T-LINE
        </span>
      </div>

      {/* Floor reflection plate */}
      <div
        className="absolute left-0 right-0 bottom-0 h-24 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(37,99,235,0) 0%, rgba(37,99,235,0.05) 70%, rgba(37,99,235,0.10) 100%)"
        }}
      />
      <div className="absolute left-0 right-0 bottom-0 h-px bg-clinical-border" />

      {/* Halo (motion-driven) */}
      <motion.div
        className="absolute"
        style={{
          left: ORB_X - 96,
          y:    haloY,
          width: 192,
          height: 192,
          opacity: glowOpacity,
          scale: glowScale,
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(37,99,235,0.55) 0%, rgba(37,99,235,0.0) 60%)",
          filter: "blur(2px)"
        }}
      />

      {/* Ripple rings */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full pointer-events-none animate-ripple"
          style={{
            left: ORB_X - 70,
            top:  targetY - 70,
            width: 140,
            height: 140,
            border: "2px solid rgba(16,185,129,0.6)",
            background: "rgba(16,185,129,0.10)"
          }}
        />
      ))}

      {/* Mirrored ground reflection of the orb */}
      <motion.div
        className="absolute"
        style={{
          left: ORB_X - ORB_R,
          y:    reflectY,
          width:  ORB_R * 2,
          height: ORB_R * 2,
          opacity: 0.35,
          transform: "scaleY(-1)",
          filter: "blur(6px)",
          pointerEvents: "none"
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, #DBEAFE 0%, #2563EB 70%, #1D4ED8 100%)"
          }}
        />
      </motion.div>

      {/* The orb (3D-feeling, multi-layer) */}
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
        {/* Ambient glow ring */}
        <div
          className="absolute -inset-2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(37,99,235,0.35) 0%, rgba(37,99,235,0) 65%)"
          }}
        />
        {/* Sphere body */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 28%, #FFFFFF 0%, #DBEAFE 22%, #60A5FA 55%, #1D4ED8 95%)",
            boxShadow:
              "0 14px 38px rgba(37,99,235,0.40), 0 0 0 1px rgba(255,255,255,0.45) inset, 0 -8px 18px rgba(15,23,42,0.18) inset"
          }}
        />
        {/* Specular */}
        <div
          className="absolute rounded-full"
          style={{
            top:  ORB_R * 0.22,
            left: ORB_R * 0.32,
            width:  ORB_R * 0.62,
            height: ORB_R * 0.36,
            background: "rgba(255,255,255,0.78)",
            filter: "blur(3px)"
          }}
        />
        {/* Subtle equator */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0) 45%, rgba(15,23,42,0.10) 55%, rgba(255,255,255,0) 70%)"
          }}
        />
      </motion.div>

      {/* Side level meter — adds the "device" feel */}
      <SideMeter running={running} threshold={threshold} getIntensity={getIntensity} />

      {/* HUD */}
      <HUD running={running} threshold={threshold} getIntensity={getIntensity} />

      {/* Status strip (bottom) */}
      <StatusStrip running={running} />
    </div>
  );
}

/* ----------------------------------------------------------------------- */

function makeParticles(n) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push({
      x: Math.random() * 800,
      y: Math.random() * 480,
      vx: (Math.random() - 0.5) * 8,
      vy: -(8 + Math.random() * 18),
      r: 1 + Math.random() * 2,
      a: 0.18 + Math.random() * 0.22
    });
  }
  return arr;
}

function HUD({ running, threshold, getIntensity }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!running) { setV(0); return; }
    const id = setInterval(() => setV(clamp01(getIntensity?.() ?? 0)), 90);
    return () => clearInterval(id);
  }, [running, getIntensity]);

  const pct = Math.round(v * 100);
  const accent = v >= threshold ? "ok" : "muted";

  return (
    <div className="absolute top-4 left-4 glass-panel px-5 py-4 flex items-center gap-5">
      <BigStat label="Drive" value={pct} unit="%" accent={accent} />
      <Divider />
      <BigStat label="Target" value={Math.round(threshold * 100)} unit="%" accent="brand" />
      <Divider />
      <Stat label="Status" value={running ? "LIVE" : "STBY"} accent={running ? "ok" : "muted"} mono />
    </div>
  );
}

function BigStat({ label, value, unit, accent }) {
  const color = {
    ok:    "text-signal-ok",
    brand: "text-brand-600",
    muted: "text-clinical-ink"
  }[accent];
  return (
    <div className="leading-tight">
      <div className="text-[11px] uppercase tracking-[0.18em] text-clinical-muted">{label}</div>
      <div className={`text-3xl font-semibold tabular-nums font-mono ${color}`}>
        {value}<span className="text-base text-clinical-muted ml-0.5">{unit}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, accent, mono }) {
  const color = {
    ok:    "text-signal-ok",
    brand: "text-brand-600",
    muted: "text-clinical-ink"
  }[accent];
  return (
    <div className="leading-tight">
      <div className="text-[11px] uppercase tracking-[0.18em] text-clinical-muted">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${mono ? "font-mono" : ""} ${color}`}>
        {value}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-9 bg-clinical-border" />;
}

/**
 * Vertical level meter — a 24-segment LED-style bar driven by intensity.
 * Mounted on the right edge to give the stage a device front-panel look.
 */
function SideMeter({ running, threshold, getIntensity }) {
  const SEGMENTS = 24;
  const [lit, setLit] = useState(0);
  useEffect(() => {
    if (!running) { setLit(0); return; }
    const id = setInterval(() => {
      const v = clamp01(getIntensity?.() ?? 0);
      setLit(Math.round(v * SEGMENTS));
    }, 60);
    return () => clearInterval(id);
  }, [running, getIntensity]);

  const thrSeg = Math.round(threshold * SEGMENTS);

  return (
    <div className="absolute top-4 right-4 bottom-4 w-12 glass-panel flex flex-col items-center justify-end p-2 gap-[3px]">
      <div className="text-[9px] uppercase tracking-[0.18em] text-clinical-muted mb-1">Lift</div>
      {Array.from({ length: SEGMENTS }).map((_, i) => {
        const idx = SEGMENTS - 1 - i; // top-down so bottom = idx 0
        const isLit = idx < lit;
        const isThr = idx === thrSeg;
        // top zone yellow→red? we'll keep it green→blue for clinical feel
        const color = !isLit
          ? "bg-clinical-surface2"
          : idx >= thrSeg
            ? "bg-signal-ok"
            : "bg-brand-500";
        return (
          <div
            key={i}
            className={`w-full h-[7px] rounded-sm ${color} ${isThr ? "ring-2 ring-emerald-300" : ""}`}
            style={{ opacity: isLit ? 1 : 0.45 }}
          />
        );
      })}
      <div className="text-[10px] font-mono tabular-nums text-clinical-muted mt-1">
        {Math.round((lit / SEGMENTS) * 100).toString().padStart(2, "0")}
      </div>
    </div>
  );
}

function StatusStrip({ running }) {
  return (
    <div className="absolute left-4 bottom-4 glass-panel px-4 py-2 flex items-center gap-4 text-xs font-mono">
      <LED label="PWR" state="ok" />
      <LED label="LINK" state={running ? "ok" : "idle"} />
      <LED label="SIG" state={running ? "ok" : "idle"} pulse={running} />
      <span className="text-clinical-muted">DRX-1 · v0.2.0</span>
    </div>
  );
}

function LED({ label, state = "idle", pulse }) {
  const color = {
    ok:    "bg-signal-ok",
    warn:  "bg-signal-warn",
    error: "bg-signal-danger",
    idle:  "bg-clinical-muted"
  }[state];
  return (
    <span className="inline-flex items-center gap-1.5 text-clinical-ink2">
      <span className={`h-2 w-2 rounded-full ${color} ${pulse ? "animate-pulse-soft" : ""}`} />
      {label}
    </span>
  );
}

function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function clamp01(x)     { return x < 0 ? 0 : x > 1 ? 1 : x; }
