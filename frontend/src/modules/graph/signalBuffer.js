export function createSignalBuffer(maxPoints = 240) {
  const points = [];
  return {
    push(value) {
      points.push(value);
      if (points.length > maxPoints) points.shift();
    },
    snapshot() {
      return [...points];
    },
    clear() {
      points.length = 0;
    }
  };
}
