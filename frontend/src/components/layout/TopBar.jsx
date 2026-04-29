import { Activity, Clock, ShieldCheck, User2 } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * TopBar — clinical-device front panel.
 *
 * Three regions: brand + model strip (left), session meta + live clock
 * (center), input source pills (right). Bigger fonts than the previous
 * iteration to read well on a clinic monitor at arm's length.
 */
export default function TopBar({
  participantId  = "—",
  sessionElapsed = "00:00",
  sessionState   = "idle",
  inputs = { semg: "idle", webcam: "idle", mic: "idle" }
}) {
  return (
    <header className="h-20 px-6 flex items-center justify-between bg-white/85 backdrop-blur border-b border-clinical-border sticky top-0 z-20 shadow-clinical-sm">
      {/* Brand + model */}
      <div className="flex items-center gap-4">
        <div
          className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white grid place-items-center shadow-clinical-md"
          aria-hidden
        >
          <Activity size={22} strokeWidth={2.4} />
        </div>
        <div className="leading-tight">
          <div className="text-xs uppercase tracking-[0.22em] text-clinical-muted font-semibold">
            Dysphagia Rehab Suite
          </div>
          <div className="text-xl font-semibold text-clinical-ink">
            Live Swallow Trainer
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-clinical-muted font-mono">
            Model DRX-1 · v0.2.0
          </div>
        </div>
      </div>

      {/* Session metadata + live clock */}
      <div className="hidden md:flex items-center gap-7">
        <Meta icon={<User2 size={17} />} label="Participant">
          <span className="font-mono tabular-nums text-base">{participantId}</span>
        </Meta>
        <Meta icon={<Clock size={17} />} label="Session">
          <span className="font-mono tabular-nums text-base">{sessionElapsed}</span>
          <SessionState state={sessionState} />
        </Meta>
        <Meta icon={<ShieldCheck size={17} />} label="Privacy">
          <span className="text-clinical-ink2 text-base">Local-only</span>
        </Meta>
        <LiveClock />
      </div>

      {/* Input source pills */}
      <div className="flex items-center gap-2">
        <InputPill label="sEMG"   state={inputs.semg} />
        <InputPill label="Webcam" state={inputs.webcam} />
        <InputPill label="Mic"    state={inputs.mic} />
      </div>
    </header>
  );
}

function Meta({ icon, label, children }) {
  return (
    <div className="flex items-center gap-2 text-base">
      <span className="text-clinical-muted">{icon}</span>
      <span className="text-clinical-muted">{label}:</span>
      <span className="text-clinical-ink font-medium flex items-center gap-2">{children}</span>
    </div>
  );
}

function SessionState({ state }) {
  const map = {
    idle:    { dot: "bg-clinical-muted",               text: "Idle"   },
    running: { dot: "bg-signal-ok animate-pulse-soft", text: "Live"   },
    paused:  { dot: "bg-signal-warn",                  text: "Paused" }
  };
  const { dot, text } = map[state] ?? map.idle;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-clinical-ink2">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {text}
    </span>
  );
}

function InputPill({ label, state }) {
  const dot = {
    ok:    "bg-signal-ok",
    warn:  "bg-signal-warn",
    error: "bg-signal-danger",
    idle:  "bg-clinical-muted"
  }[state];
  return (
    <span className="status-pill text-sm px-3 py-1.5" data-state={state}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return (
    <div className="leading-tight">
      <div className="text-[10px] uppercase tracking-[0.2em] text-clinical-muted">Local time</div>
      <div className="text-base font-mono tabular-nums text-clinical-ink">
        {hh}:{mm}<span className="text-clinical-muted">:{ss}</span>
      </div>
    </div>
  );
}
