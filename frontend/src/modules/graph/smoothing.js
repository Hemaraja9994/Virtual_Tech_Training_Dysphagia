/**
 * Signal smoothing utilities.
 *
 * Sensor / webcam pixel-difference / mic-RMS streams are jittery. We expose
 * two complementary filters used by the dashboard:
 *
 *   • createEMA(alpha)        — exponential moving average. Cheap, low latency.
 *   • createKalman1D(opts)    — scalar Kalman filter. Smoother, slightly laggy.
 *
 * Both follow the same {push, value, reset} contract so callers can swap.
 */

/**
 * Exponential moving average. Larger alpha → more responsive, less smooth.
 */
export function createEMA(alpha = 0.3) {
  let prev = null;
  return {
    push(x) {
      if (!Number.isFinite(x)) return prev ?? 0;
      prev = prev == null ? x : prev + alpha * (x - prev);
      return prev;
    },
    value() { return prev ?? 0; },
    reset() { prev = null; }
  };
}

/**
 * Scalar (1D) Kalman filter — appropriate for smoothing a noisy 0..1 signal.
 *
 *   q  → process variance.  Higher = trust new measurements more.
 *   r  → measurement variance. Higher = smoother but laggier output.
 */
export function createKalman1D({ q = 0.0008, r = 0.02, initial = 0 } = {}) {
  let x = initial; // estimate
  let p = 1;       // estimate covariance

  return {
    push(z) {
      if (!Number.isFinite(z)) return x;
      // predict
      p = p + q;
      // update
      const k = p / (p + r);
      x = x + k * (z - x);
      p = (1 - k) * p;
      return x;
    },
    value() { return x; },
    reset(initial2 = 0) { x = initial2; p = 1; }
  };
}
