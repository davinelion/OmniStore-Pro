/**
 * AmbientBackground — the fixed, non-interactive light source behind the app.
 *
 * Three slowly drifting aurora blobs over a faint technical grid. It is
 * purely decorative: `aria-hidden`, `pointer-events: none`, and every
 * animation is disabled under `prefers-reduced-motion` (see globals.css).
 *
 * Rendered once, behind all content, at a negative z-index so it never
 * participates in stacking-context bugs with sticky headers or modals.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Violet bloom, top-left */}
      <div
        className="aurora-blob animate-aurora bg-accent/25 dark:bg-accent/30"
        style={{ top: "-14rem", left: "-10rem", width: "38rem", height: "38rem" }}
      />
      {/* Cyan bloom, top-right */}
      <div
        className="aurora-blob animate-aurora bg-accent-2/20 dark:bg-accent-2/25"
        style={{
          top: "-8rem",
          right: "-12rem",
          width: "34rem",
          height: "34rem",
          animationDelay: "-8s",
        }}
      />
      {/* Deep violet wash, lower-centre — keeps long pages from feeling flat */}
      <div
        className="aurora-blob animate-aurora bg-accent/15 dark:bg-accent/20"
        style={{
          bottom: "-22rem",
          left: "30%",
          width: "42rem",
          height: "42rem",
          animationDelay: "-16s",
        }}
      />
      {/* Technical grid, fading out toward the fold */}
      <div className="bg-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_78%)]" />
    </div>
  );
}
