import { Activity, Clock, ShieldCheck, User2 } from "lucide-react";

/**
 * TopBar — fixed-height clinical header.
 *
 * Pure presentation: the Dashboard owns wiring to inputManager state.
 */
export default function TopBar({
  participantId  = "—",
  sessionElapsed = "00:00",
  sessionState   = "idle",
  inputs = { semg: "idle", webcam: "idle", mic: "idle" }
}) {
  return (
    <header className="h-16 px-6 flex items-center justify-between bg-white/80 backdrop-blur border-b border-clinical-border sticky top-0 z-20">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-xl bg-brand-600 text-white grid place-items-center shadow-clinical-sm"
          aria-hidden
        >
          <Activity size={18} strokeWidth={2.4} />
        </div>
        <div className="leading-tight">
          <div className="text-[0.72rem] uppercase tracking-[0.18em] text-clinical-muted">
            Dysphagia Rehab
          </div>
          <div className="text-[0.95rem] font-semibold text-clinical-ink">
            Clinical Telemetry Console
          </div>
        </div>
      </div>

      {/* Session metadata */}
      <div className="hidden md:flex items-center gap-6">
        <Meta icon={<User2 size={15} />} label="Participant">
          <span className="font-mono tabular-nums">{participantId}</span>
        </Meta>
        <Meta icon={<Clock size={15} />} label="Session">
          <span className="font-mono tabular-nums">{sessionElapsed}</span>
          <SessionState state={sessionState} />
        </Meta>
        <Meta icon={<ShieldCheck size={15} />} label="Privacy">
          <span className="text-clinical-ink2">Local-only</span>
        </Meta>
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
    <div className="flex items-center gap-2 text-sm">
      <span className="text-clinical-muted">{icon}</span>
      <span className="text-clinical-muted">{label}:</span>
      <span className="text-clinical-ink font-medium flex items-center gap-2">{children}</span>
    </div>
  );
}

function SessionState({ state }) {
  const map = {
    idle:    { dot: "bg-clinical-muted",                     text: "Idle"   },
    running: { dot: "bg-signal-ok animate-pulse-soft",       text: "Live"   },
    paused:  { dot: "bg-signal-warn",                        text: "Paused" }
  };
  const { dot, text } = map[state] ?? map.idle;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-clinical-ink2">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
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
    <span className="status-pill" data-state={state}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
