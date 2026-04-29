import { clamp01, INPUT_SOURCES } from "../input/types";

function createDefaultState() {
  return {
    activeSource: INPUT_SOURCES.SEMG,
    sensitivity: 1,
    threshold: 0.2,
    normalizedIntensity: 0,
    latestRawValue: 0,
    quality: 1,
    status: "idle"
  };
}

export function createInputManager({ adapters }) {
  const state = createDefaultState();
  let onSample = null;

  function emitSample(source, rawValue, quality = 1) {
    const thresholded = Math.max(0, rawValue - state.threshold);
    const normalized = clamp01(thresholded * state.sensitivity);
    state.normalizedIntensity = normalized;
    state.latestRawValue = rawValue;
    state.quality = quality;
    if (onSample) {
      onSample({
        source,
        rawValue,
        normalizedValue: normalized,
        quality,
        timestampMs: Date.now()
      });
    }
  }

  function startAdapter(source, config = {}) {
    const adapter = adapters[source];
    if (!adapter) throw new Error(`Unsupported source: ${source}`);
    state.status = "running";
    adapter.start({
      ...config,
      onRawSample: (rawValue, quality) => emitSample(source, rawValue, quality),
      onStatus: (status) => {
        state.status = status;
      }
    });
  }

  return {
    getState() {
      return { ...state };
    },
    subscribeSample(callback) {
      onSample = callback;
      return () => {
        onSample = null;
      };
    },
    setSensitivity(value) {
      state.sensitivity = value;
    },
    setThreshold(value) {
      state.threshold = value;
    },
    selectSource(source) {
      if (source === state.activeSource) return;
      this.stop();
      state.activeSource = source;
    },
    start(config = {}) {
      this.stop();
      startAdapter(state.activeSource, config);
    },
    stop() {
      const adapter = adapters[state.activeSource];
      if (adapter && adapter.stop) adapter.stop();
      state.status = "idle";
      state.normalizedIntensity = 0;
    }
  };
}
