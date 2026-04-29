/**
 * Floating camera preview — visible while running and webcam-based source
 * is active. Refs are passed in (not forwarded) because we need three of
 * them: <video>, overlay <canvas>, and a hidden processing <canvas>.
 */
export default function CameraOverlay({
  visible,
  videoRef,
  overlayRef,
  processingRef
}) {
  return (
    <div
      className={`pointer-events-none absolute top-4 right-4 w-[260px] h-[148px] rounded-clinical overflow-hidden glass-panel transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={overlayRef} className="absolute inset-0 w-full h-full" />
      <canvas ref={processingRef} className="hidden" />
      <div className="absolute bottom-1.5 left-2 text-[10px] uppercase tracking-[0.18em] text-clinical-muted">
        Webcam preview · local
      </div>
    </div>
  );
}
