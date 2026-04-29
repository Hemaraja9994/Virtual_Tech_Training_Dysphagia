import { Cable, Camera, Mic, Pause, Play, RotateCcw } from "lucide-react";
import { INPUT_SOURCES } from "../modules/input/types";

/**
 * Controls — clinical bottom panel.
 *
 * Contains:
 *  • Input source toggle group (sEMG / Webcam / Mic)
 *  • Sensitivity / Threshold sliders
 *  • Session start / stop / reset
 *
 * Pure controlled component: lifts every change up via callbacks.
 */
export default function Controls({
  source,
  onSourceChange,
  sensitivity,
  onSensitivityChange,
  threshold,
  onThresholdChange,
  running,
  onStart,
  onStop,
  onReset,
  successfulSwallows = 0
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr_auto] items-end">
      {/* Input source */}
      <div>
        <Label>Input source</Label>
        <div className="seg-group" role="tablist">
          <SourceBtn
            label="sEMG"
            icon={<Cable size={14} />}
            active={source === INPUT_SOURCES.SEMG}
            onClick={() => onSourceChange(INPUT_SOURCES.SEMG)}
          />
          <SourceBtn
            label="Webcam"
            icon={<Camera size={14} />}
            active={source === INPUT_SOURCES.WEBCAM}
            onClick={() => onSourceChange(INPUT_SOURCES.WEBCAM)}
          />
          <SourceBtn
            label="Microphone"
            icon={<Mic size={14} />}
            active={source === INPUT_SOURCES.MICROPHONE}
            onClick={() => onSourceChange(INPUT_SOURCES.MICROPHONE)}
          />
        </div>
        <Counter swallows={successfulSwallows} />
      </div>

      {/* Sliders */}
      <div className="grid gap-4">
        <Slider
          label="Sensitivity / Gain"
          min={0.5} max={4} step={0.1}
          value={sensitivity}
          onChange={onSensitivityChange}
          format={(v) => `${v.toFixed(1)}×`}
        />
        <Slider
          label="Target Threshold"
          min={0} max={0.9} step={0.01}
          value={threshold}
          onChange={onThresholdChange}
          format={(v) => v.toFixed(2)}
          accent="ok"
        />
      </div>

      {/* Session actions */}
      <div className="flex flex-wrap gap-2 justify-end">
        {!running ? (
          <button className="clinical-btn-primary" onClick={onStart}>
            <Play size={16} /> Start session
          </button>
        ) : (
          <button className="clinical-btn-danger" onClick={onStop}>
            <Pause size={16} /> End session
          </button>
        )}
        <button className="clinical-btn-secondary" onClick={onReset} disabled={running}>
          <RotateCcw size={16} /> Reset
        </button>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function Label({ children }) {
  return <div className="panel-title mb-2">{children}</div>;
}

function SourceBtn({ label, icon, active, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-active={active}
      className="seg-btn flex items-center gap-1.5"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function Slider({ label, min, max, step, value, onChange, format, accent }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-clinical-ink2">{label}</span>
        <span
          className={`font-mono tabular-nums text-xs px-2 py-0.5 rounded-md border ${
            accent === "ok"
              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : "text-brand-700 bg-brand-50 border-brand-100"
          }`}
        >
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        className="clinical-range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Counter({ swallows }) {
  return (
    <div className="mt-3 inline-flex items-center gap-2 text-xs text-clinical-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-signal-ok" />
      Successful swallows
      <span className="font-mono tabular-nums text-clinical-ink font-semibold">
        {swallows}
      </span>
    </div>
  );
}
