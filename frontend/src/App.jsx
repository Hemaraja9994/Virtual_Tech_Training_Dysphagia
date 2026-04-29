import { useEffect, useMemo, useRef, useState } from "react";
import CameraOverlay from "./components/CameraOverlay";
import Controls from "./components/Controls";
import Dashboard from "./components/Dashboard";
import LiveMonitor from "./components/LiveMonitor";
import Simulation from "./components/Simulation";
import TopBar from "./components/layout/TopBar";

import { createMicrophoneAdapter } from "./modules/input/microphoneAdapter";
import { createSemgAdapter } from "./modules/input/semgAdapter";
import { INPUT_SOURCES } from "./modules/input/types";
import { createWebcamAdapter } from "./modules/input/webcamAdapter";
import { createKalman1D } from "./modules/graph/smoothing";
import { createInputManager } from "./modules/state/inputManager";

/**
 * App — clinical dashboard container.
 *
 * Wires the existing inputManager (sEMG / Webcam / Mic) to the new UI:
 *   • Smoothed swallow intensity drives the Simulation orb (Phase 3) and
 *     the LiveMonitor trace (Phase 2).
 *   • Source/sensitivity/threshold flow from <Controls> back into the manager.
 *   • A Kalman filter sits between the raw adapter samples and the renderers.
 */
export default function App() {
  const [source, setSource]               = useState(INPUT_SOURCES.SEMG);
  const [sensitivity, setSensitivity]     = useState(1.4);
  const [threshold, setThreshold]         = useState(0.20);
  const [running, setRunning]             = useState(false);
  const [adapterStatus, setAdapterStatus] = useState("idle");
  const [successes, setSuccesses]         = useState(0);
  const [elapsed, setElapsed]             = useState(0);

  // Signal pipeline lives outside React state to avoid per-frame re-renders.
  const intensityRef = useRef(0);
  const kalmanRef    = useRef(createKalman1D({ q: 0.0009, r: 0.018 }));
  const inputMgrRef  = useRef(null);

  const videoRef      = useRef(null);
  const overlayRef    = useRef(null);
  const processingRef = useRef(null);
  const adapters = useMemo(
    () => ({
      [INPUT_SOURCES.SEMG]:       createSemgAdapter(),
      [INPUT_SOURCES.WEBCAM]:     createWebcamAdapter(),
      [INPUT_SOURCES.MICROPHONE]: createMicrophoneAdapter()
    }),
    []
  );

  useEffect(() => {
    const mgr = createInputManager({ adapters });
    inputMgrRef.current = mgr;

    const unsub = mgr.subscribeSample((sample) => {
      const smoothed = clamp01(kalmanRef.current.push(sample.normalizedValue));
      intensityRef.current = smoothed;
    });

    return () => {
      unsub();
      mgr.stop();
    };
  }, [adapters]);

  useEffect(() => { inputMgrRef.current?.setSensitivity(sensitivity); }, [sensitivity]);
  useEffect(() => { inputMgrRef.current?.setThreshold(threshold); },     [threshold]);
  useEffect(() => {
    if (!inputMgrRef.current) return;
    inputMgrRef.current.selectSource(source);
    setAdapterStatus("idle");
  }, [source]);

  useEffect(() => {
    if (!running) return;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const getIntensity = useMemo(() => () => intensityRef.current, []);

  async function startSession() {
    setSuccesses(0);
    setElapsed(0);
    kalmanRef.current.reset(0);
    intensityRef.current = 0;
    setRunning(true);
    try {
      await inputMgrRef.current.start({
        wsUrl: "ws://127.0.0.1:8000/ws/semg",
        videoEl:      videoRef.current,
        overlayEl:    overlayRef.current,
        processingEl: processingRef.current,
        onStatus: (s) => setAdapterStatus(s)
      });
    } catch (err) {
      setAdapterStatus("error");
      console.error(err);
    }
  }

  function stopSession() {
    inputMgrRef.current?.stop();
    setRunning(false);
    setAdapterStatus("idle");
    intensityRef.current = 0;
    kalmanRef.current.reset(0);
  }

  function resetSession() {
    setSuccesses(0);
    setElapsed(0);
    intensityRef.current = 0;
    kalmanRef.current.reset(0);
  }

  const inputs = useMemo(() => {
    const s = adapterStatus;
    const stateFor = (key) => {
      if (key !== source) return "idle";
      if (s === "connected" || s === "running") return "ok";
      if (s === "connecting") return "warn";
      if (s === "error" || s === "disconnected") return "error";
      return "idle";
    };
    return {
      semg:   stateFor(INPUT_SOURCES.SEMG),
      webcam: stateFor(INPUT_SOURCES.WEBCAM),
      mic:    stateFor(INPUT_SOURCES.MICROPHONE)
    };
  }, [adapterStatus, source]);

  const elapsedFmt = useMemo(() => {
    const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const s = String(elapsed % 60).padStart(2, "0");
    return `${m}:${s}`;
  }, [elapsed]);

  return (
    <Dashboard
      topBar={
        <TopBar
          participantId="PT-001"
          sessionElapsed={elapsedFmt}
          sessionState={running ? "running" : "idle"}
          inputs={inputs}
        />
      }
      stage={
        <Simulation
          getIntensity={getIntensity}
          threshold={threshold}
          running={running}
          onSuccess={() => setSuccesses((c) => c + 1)}
        />
      }
      stageMeta={running ? "Live · real-time biofeedback" : "Standby — press Start session to begin"}
      stageHeader={
        <span className="status-pill" data-state={running ? "ok" : "idle"}>
          <span className={`h-1.5 w-1.5 rounded-full ${running ? "bg-signal-ok animate-pulse-soft" : "bg-clinical-muted"}`} />
          {running ? "Streaming" : "Idle"}
        </span>
      }
      cameraOverlay={
        <CameraOverlay
          visible={running && source === INPUT_SOURCES.WEBCAM}
          videoRef={videoRef}
          overlayRef={overlayRef}
          processingRef={processingRef}
        />
      }
      monitor={
        <LiveMonitor
          getSignal={getIntensity}
          threshold={threshold}
          running={running}
          windowSec={8}
          tickHz={60}
          label={`${labelFor(source)} · smoothed`}
        />
      }
      monitorMeta={`${labelFor(source)} · 60 Hz · Kalman-smoothed`}
      controls={
        <Controls
          source={source}
          onSourceChange={setSource}
          sensitivity={sensitivity}
          onSensitivityChange={setSensitivity}
          threshold={threshold}
          onThresholdChange={setThreshold}
          running={running}
          onStart={startSession}
          onStop={stopSession}
          onReset={resetSession}
          successfulSwallows={successes}
        />
      }
    />
  );
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

function labelFor(source) {
  return {
    [INPUT_SOURCES.SEMG]:       "sEMG",
    [INPUT_SOURCES.WEBCAM]:     "Webcam motion",
    [INPUT_SOURCES.MICROPHONE]: "Microphone"
  }[source] ?? "Signal";
}
