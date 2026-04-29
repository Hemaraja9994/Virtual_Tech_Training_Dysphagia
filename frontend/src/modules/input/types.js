export const INPUT_SOURCES = {
  SEMG: "semg",
  WEBCAM: "webcam",
  MICROPHONE: "microphone"
};

export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
