import { clamp01 } from "./types";

export function createMicrophoneAdapter() {
  let audioContext = null;
  let analyser = null;
  let stream = null;
  let raf = null;
  let onRawSample = null;
  let onStatus = null;
  let baseline = 0.02;

  function loop() {
    if (!analyser || !onRawSample) return;
    const buffer = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buffer);

    let sum = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      const sample = (buffer[i] - 128) / 128;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / buffer.length);
    baseline = baseline * 0.995 + rms * 0.005;
    const envelope = Math.max(0, rms - baseline);
    const normalized = clamp01(envelope * 12);
    onRawSample(normalized, 1);

    raf = requestAnimationFrame(loop);
  }

  return {
    async start(config) {
      onRawSample = config.onRawSample;
      onStatus = config.onStatus;
      onStatus?.("requesting-permission");
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioContext = new window.AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      onStatus?.("connected");
      loop();
    },
    stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (audioContext) audioContext.close();
      stream = null;
      analyser = null;
      audioContext = null;
      onRawSample = null;
      onStatus = null;
    }
  };
}
