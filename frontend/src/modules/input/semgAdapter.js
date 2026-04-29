import { clamp01 } from "./types";

export function createSemgAdapter() {
  let socket = null;
  let configRef = null;

  return {
    start(config) {
      configRef = config;
      const wsUrl = config.wsUrl || "ws://127.0.0.1:8000/ws/semg";
      config.onStatus?.("connecting");

      socket = new WebSocket(wsUrl);
      socket.onopen = () => config.onStatus?.("connected");
      socket.onerror = () => config.onStatus?.("error");
      socket.onclose = () => config.onStatus?.("disconnected");
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const amplitude = Number(payload.amplitude ?? 0);
          config.onRawSample?.(clamp01(amplitude), payload.quality ?? 1);
        } catch {
          config.onRawSample?.(0, 0);
        }
      };
    },
    stop() {
      if (socket) socket.close();
      socket = null;
      configRef = null;
    }
  };
}
