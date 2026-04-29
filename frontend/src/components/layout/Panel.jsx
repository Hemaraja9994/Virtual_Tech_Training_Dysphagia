import clsx from "clsx";

/**
 * Panel — the single source of truth for clinical surfaces.
 *
 * variant:
 *   "card"      → solid white card with hairline border (default)
 *   "glass"     → translucent floating overlay (over stage gradient)
 *   "telemetry" → ECG-style faint grid surface (LiveMonitor host)
 */
export default function Panel({
  title,
  meta,
  variant = "card",
  className,
  bodyClassName,
  headerRight,
  children
}) {
  const surface = {
    card:      "clinical-card",
    glass:     "glass-panel",
    telemetry: "telemetry-surface"
  }[variant];

  return (
    <section className={clsx(surface, "flex flex-col min-h-0", className)}>
      {(title || meta || headerRight) && (
        <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-clinical-border/80">
          <div className="flex items-baseline gap-3 min-w-0">
            {title && <h2 className="panel-title truncate">{title}</h2>}
            {meta && <span className="text-xs text-clinical-muted truncate">{meta}</span>}
          </div>
          {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </header>
      )}
      <div className={clsx("flex-1 min-h-0", bodyClassName ?? "p-5")}>
        {children}
      </div>
    </section>
  );
}
