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
          title="Anti-Gravity Challenge"
          meta={stageMeta ?? "Maintain the orb above the target line"}
          headerRight={stageHeader}
          className="row-span-1 min-h-[460px]"
          bodyClassName="p-0 relative overflow-hidden rounded-b-clinical"
        >
          {stage}
          {cameraOverlay}
        </Panel>

        <Panel
          title="Live Telemetry"
          meta={monitorMeta ?? "Raw signal · 60 Hz"}
          variant="telemetry"
          className="row-span-1 min-h-[460px]"
          bodyClassName="p-0 relative h-full"
        >
          {monitor}
        </Panel>

        <Panel title="Session Controls" className="lg:col-span-2">
          {controls}
        </Panel>
      </div>

      <footer className="px-6 py-3 text-[11px] text-clinical-muted border-t border-clinical-border bg-white/60 backdrop-blur">
        Webcam and microphone data are processed locally in browser memory.
        sEMG streams from a local FastAPI WebSocket and is not transmitted off-device.
      </footer>
    </div>
  );
}
