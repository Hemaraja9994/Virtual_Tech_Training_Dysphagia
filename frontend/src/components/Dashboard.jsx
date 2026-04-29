import Panel from "./layout/Panel";
import TopBar from "./layout/TopBar";

/**
 * Dashboard — pure layout shell. Slots are filled by the App container.
 *
 * Grid (≥ lg):
 *   ┌─────────────────────────────────────────────┐
 *   │ TopBar                                      │
 *   ├──────────────────────────┬──────────────────┤
 *   │   Stage (Simulation)     │  LiveMonitor     │
 *   ├──────────────────────────┴──────────────────┤
 *   │ Controls                                    │
 *   └─────────────────────────────────────────────┘
 */
export default function Dashboard({
  topBar,
  stage,
  monitor,
  controls,
  stageMeta,
  monitorMeta,
  stageHeader,
  cameraOverlay
}) {
  return (
    <div className="min-h-screen bg-stage-gradient flex flex-col">
      {topBar ?? <TopBar />}

      <div
        className="flex-1 grid gap-5 p-5
                   grid-cols-1
                   lg:grid-cols-[minmax(0,1fr)_360px]
                   xl:grid-cols-[minmax(0,1fr)_440px]
                   grid-rows-[minmax(420px,1fr)_auto]"
      >
        <Panel
          title="Live Swallow Trainer"
          meta={stageMeta ?? "Lift the sphere above the target line — sustained drive earns points"}
          headerRight={stageHeader}
          className="row-span-1 min-h-[520px]"
          bodyClassName="p-0 relative overflow-hidden rounded-b-clinical"
        >
          {stage}
          {cameraOverlay}
        </Panel>

        <Panel
          title="Live Telemetry"
          meta={monitorMeta ?? "Raw signal · 60 Hz"}
          variant="telemetry"
          className="row-span-1 min-h-[520px]"
          bodyClassName="p-0 relative h-full"
        >
          {monitor}
        </Panel>

        <Panel title="Session Controls" className="lg:col-span-2">
          {controls}
        </Panel>
      </div>

      <footer className="px-6 py-4 border-t border-clinical-border bg-white/70 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4 text-sm text-clinical-ink2">
          <div className="space-y-1">
            <div>
              <span className="text-clinical-muted">Concept:</span>{" "}
              <span className="font-semibold text-clinical-ink">Mr. Joju Joseph</span>{" "}
              <span className="text-clinical-muted">— Postgraduate Student, Speech-Language Pathologist</span>
            </div>
            <div>
              <span className="text-clinical-muted">Guide:</span>{" "}
              <span className="font-semibold text-clinical-ink">Mr. Hemaraja Nayaka S.</span>{" "}
              <span className="text-clinical-muted">— Associate Professor, Speech-Language Pathologist</span>
            </div>
          </div>
          <div className="text-xs text-clinical-muted max-w-md text-right">
            Webcam and microphone data are processed locally in browser memory.
            sEMG streams from a local FastAPI WebSocket and is not transmitted off-device.
          </div>
        </div>
      </footer>
    </div>
  );
}
