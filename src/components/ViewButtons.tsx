import type { StandardView } from "@/core/types";
import { useViewerStore } from "@/store/viewerStore";

const VIEWS: { id: StandardView; label: string }[] = [
  { id: "perspective", label: "Vista Perspectiva" },
  { id: "front", label: "Vista Frontal" },
  { id: "right", label: "Vista Lateral" },
  { id: "top", label: "Vista Superior" },
];

/** Botones de vistas rapidas de camara. */
export function ViewButtons() {
  const requestView = useViewerStore((s) => s.requestView);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {VIEWS.map((view) => (
        <button
          key={view.id}
          type="button"
          className="btn btn--secondary"
          style={{ width: "100%", justifyContent: "flex-start" }}
          onClick={() => requestView(view.id)}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
