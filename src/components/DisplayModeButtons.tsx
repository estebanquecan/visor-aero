import type { DisplayMode } from "@/core/types";
import { useViewerStore } from "@/store/viewerStore";

const MODES: { id: DisplayMode; label: string }[] = [
  { id: "shaded", label: "Shaded" },
  { id: "ghosted", label: "Ghosted" },
  { id: "rendered", label: "Rendered" },
];

/** Selector del modo de visualizacion de superficies. */
export function DisplayModeButtons() {
  const displayMode = useViewerStore((s) => s.displayMode);
  const setDisplayMode = useViewerStore((s) => s.setDisplayMode);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          className={`btn btn--secondary${displayMode === mode.id ? " is-active" : ""}`}
          style={{ width: "100%", justifyContent: "flex-start" }}
          aria-pressed={displayMode === mode.id}
          onClick={() => setDisplayMode(mode.id)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
