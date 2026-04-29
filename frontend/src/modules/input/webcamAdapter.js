import { clamp01 } from "./types";

export function createWebcamAdapter() {
  let stream = null;
  let raf = null;
  let prevGray = null;
  let prevPoint = null;
  let point = null;
  let deps = null;

  function cleanupCv() {
    if (prevGray) prevGray.delete();
    if (prevPoint) prevPoint.delete();
    prevGray = null;
    prevPoint = null;
  }

  function drawTrackingDot() {
    if (!deps?.overlayEl || !point) return;
    const ctx = deps.overlayEl.getContext("2d");
    ctx.clearRect(0, 0, deps.overlayEl.width, deps.overlayEl.height);
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function trackLoop() {
    raf = requestAnimationFrame(trackLoop);
    if (!deps?.videoEl || !deps.processingEl || !deps.overlayEl || !window.cv) return;
    const { videoEl, processingEl, overlayEl, onRawSample } = deps;
    if (videoEl.readyState < 2 || videoEl.videoWidth === 0) return;

    processingEl.width = videoEl.videoWidth;
    processingEl.height = videoEl.videoHeight;
    overlayEl.width = videoEl.videoWidth;
    overlayEl.height = videoEl.videoHeight;
    const pctx = processingEl.getContext("2d", { willReadFrequently: true });
    pctx.drawImage(videoEl, 0, 0, processingEl.width, processingEl.height);
    const img = pctx.getImageData(0, 0, processingEl.width, processingEl.height);
    const src = window.cv.matFromImageData(img);
    const gray = new window.cv.Mat();
    window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);
    src.delete();

    if (!point) {
      gray.delete();
      onRawSample?.(0, 0);
      return;
    }

    if (!prevGray || !prevPoint) {
      prevPoint = window.cv.matFromArray(1, 1, window.cv.CV_32FC2, [point.x, point.y]);
      prevGray = gray.clone();
      drawTrackingDot();
      onRawSample?.(0, 1);
      gray.delete();
      return;
    }

    const nextPts = new window.cv.Mat();
    const status = new window.cv.Mat();
    const err = new window.cv.Mat();
    const winSize = new window.cv.Size(21, 21);
    const criteria = new window.cv.TermCriteria(
      window.cv.TermCriteria_EPS | window.cv.TermCriteria_COUNT,
      20,
      0.03
    );
    window.cv.calcOpticalFlowPyrLK(
      prevGray,
      gray,
      prevPoint,
      nextPts,
      status,
      err,
      winSize,
      3,
      criteria
    );
    if (status.data[0] === 1) {
      const previousY = prevPoint.data32F[1];
      const newX = nextPts.data32F[0];
      const newY = nextPts.data32F[1];
      const deltaUp = Math.max(0, previousY - newY);
      point = { x: newX, y: newY };
      onRawSample?.(clamp01(deltaUp / 18), 1);
      deps.onStatus?.("tracking");
      drawTrackingDot();
    } else {
      onRawSample?.(0, 0);
      deps.onStatus?.("lost-point");
    }

    prevPoint.delete();
    prevPoint = nextPts.clone();
    if (prevGray) prevGray.delete();
    prevGray = gray.clone();

    nextPts.delete();
    status.delete();
    err.delete();
    gray.delete();
  }

  return {
    async start(config) {
      deps = config;
      if (!window.cv || typeof window.cv.Mat !== "function") {
        config.onStatus?.("opencv-loading");
      }
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 }, audio: false });
      config.videoEl.srcObject = stream;
      await config.videoEl.play();
      config.onStatus?.("select-point");

      const clickHandler = (event) => {
        const rect = config.videoEl.getBoundingClientRect();
        const x = ((event.clientX - rect.left) * config.videoEl.videoWidth) / rect.width;
        const y = ((event.clientY - rect.top) * config.videoEl.videoHeight) / rect.height;
        point = { x, y };
        cleanupCv();
        config.onStatus?.("point-locked");
      };
      config.videoEl.addEventListener("click", clickHandler);
      deps.clickHandler = clickHandler;
      trackLoop();
    },
    stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      if (deps?.videoEl && deps?.clickHandler) {
        deps.videoEl.removeEventListener("click", deps.clickHandler);
      }
      if (stream) stream.getTracks().forEach((track) => track.stop());
      stream = null;
      if (deps?.videoEl) deps.videoEl.srcObject = null;
      if (deps?.overlayEl) {
        const ctx = deps.overlayEl.getContext("2d");
        ctx.clearRect(0, 0, deps.overlayEl.width, deps.overlayEl.height);
      }
      point = null;
      cleanupCv();
      deps = null;
    }
  };
}
