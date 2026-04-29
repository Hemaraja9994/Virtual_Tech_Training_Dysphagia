import { useEffect, useMemo, useRef, useState } from "react";
import { createGameEngine } from "./modules/game/engine";
import { createSignalBuffer } from "./modules/graph/signalBuffer";
import { createMicrophoneAdapter } from "./modules/input/microphoneAdapter";
import { createSemgAdapter } from "./modules/input/semgAdapter";
import { INPUT_SOURCES } from "./modules/input/types";
import { createWebcamAdapter } from "./modules/input/webcamAdapter";
import { createInputManager } from "./modules/state/inputManager";

export default function App() {
  const [source, setSource] = useState(INPUT_SOURCES.SEMG);
  const [sensitivity, setSensitivity] = useState(1.4);
  const [threshold, setThreshold] = useState(0.2);
  const [status, setStatus] = useState("idle");
  const [sessionActive, setSessionActive] = useState(false);
  const [successfulSwallows, setSuccessfulSwallows] = useState(0);
  const [intensity, setIntensity] = useState(0);

  const gameCanvasRef = useRef(null);
  const graphCanvasRef = useRef(null);
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const processingRef = useRef(null);

  const engineRef = useRef(null);
  const inputManagerRef = useRef(null);
  const signalBufferRef = useRef(createSignalBuffer(280));
  const intensityRef = useRef(0);

  const adapters = useMemo(
    () => ({
      [INPUT_SOURCES.SEMG]: createSemgAdapter(),
      [INPUT_SOURCES.WEBCAM]: createWebcamAdapter(),
      [INPUT_SOURCES.MICROPHONE]: createMicrophoneAdapter()
    }),
    []
  );

  useEffect(() => {
    inputManagerRef.current = createInputManager({ adapters });
    const unsubscribe = inputManagerRef.current.subscribeSample((sample) => {
      intensityRef.current = sample.normalizedValue;
      setIntensity(sample.normalizedValue);
      signalBufferRef.current.push(sample.rawValue);
    });
    return () => {
      unsubscribe();
      inputManagerRef.current?.stop();
    };
  }, [adapters]);

  useEffect(() => {
    if (!gameCanvasRef.current) return;
    engineRef.current = createGameEngine(gameCanvasRef.current, () => intensityRef.current, () => {
      setSuccessfulSwallows((c) => c + 1);
    });
    engineRef.current.start();
    return () => engineRef.current?.stop();
  }, []);

  useEffect(() => {
    let raf = null;
    const drawGraph = () => {
      raf = requestAnimationFrame(drawGraph);
      const canvas = graphCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const points = signalBufferRef.current.snapshot();
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((value, index) => {
        const x = (index / Math.max(1, points.length - 1)) * canvas.width;
        const y = canvas.height - value * canvas.height;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };
    raf = requestAnimationFrame(drawGraph);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    inputManagerRef.current?.setSensitivity(sensitivity);
  }, [sensitivity]);

  useEffect(() => {
    inputManagerRef.current?.setThreshold(threshold);
  }, [threshold]);

  useEffect(() => {
    if (!inputManagerRef.current) return;
    inputManagerRef.current.selectSource(source);
    setStatus("idle");
  }, [source]);

  async function startSession() {
    signalBufferRef.current.clear();
    setSuccessfulSwallows(0);
    setSessionActive(true);
    try {
      await inputManagerRef.current.start({
        wsUrl: "ws://127.0.0.1:8000/ws/semg",
        videoEl: videoRef.current,
        overlayEl: overlayRef.current,
        processingEl: processingRef.current,
        onStatus: (next) => setStatus(next)
      });
    } catch (error) {
      setStatus("error");
      console.error(error);
    }
  }

  function endSession() {
    inputManagerRef.current?.stop();
    setSessionActive(false);
    setStatus("idle");
    setIntensity(0);
    intensityRef.current = 0;
  }

  return (
    <main className="app-shell">
      <section className="panel controls">
        <h1>Multi-Modal Dysphagia Rehab Simulator</h1>
        <p className="privacy-note">Webcam and microphone data are processed locally in browser memory only.</p>
        <label className="field">
          Input Selector
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value={INPUT_SOURCES.SEMG}>sEMG (WebSocket)</option>
            <option value={INPUT_SOURCES.WEBCAM}>Webcam CV</option>
            <option value={INPUT_SOURCES.MICROPHONE}>Microphone Audio</option>
          </select>
        </label>
        <label className="slider-wrap">
          Sensitivity/Gain
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.1"
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
          />
          <strong>{sensitivity.toFixed(1)}</strong>
        </label>
        <label className="slider-wrap">
          Threshold
          <input
            type="range"
            min="0"
            max="0.9"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
          <strong>{threshold.toFixed(2)}</strong>
        </label>
        <div className="control-row">
          <button onClick={startSession} disabled={sessionActive}>
            Start Session
          </button>
          <button onClick={endSession} disabled={!sessionActive}>
            End Session
          </button>
        </div>
        <p className="status-line">
          Status: <strong>{status}</strong>
        </p>
        <p className="status-line">
          Normalized Swallow Intensity: <strong>{intensity.toFixed(2)}</strong>
        </p>
        <p className="status-line">
          Total Successful Swallows: <strong>{successfulSwallows}</strong>
        </p>
      </section>

      <section className="panel stage">
        <canvas ref={gameCanvasRef} width={920} height={460} className="game-canvas" />
        <canvas ref={graphCanvasRef} width={920} height={140} className="graph-canvas" />
        <div className="camera-overlay">
          <video ref={videoRef} playsInline muted />
          <canvas ref={overlayRef} className="tracking-overlay" />
          <canvas ref={processingRef} className="hidden-processing" />
        </div>
      </section>
    </main>
  );
}
