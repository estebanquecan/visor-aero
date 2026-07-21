import { useViewerStore } from "@/store/viewerStore";
import styles from "./DisplayOptions.module.css";

/** Casillas de Mostrar Grid / Mostrar Aristas. */
export function DisplayOptions() {
  const showGrid = useViewerStore((s) => s.showGrid);
  const showEdges = useViewerStore((s) => s.showEdges);
  const toggleGrid = useViewerStore((s) => s.toggleGrid);
  const toggleEdges = useViewerStore((s) => s.toggleEdges);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label className={styles.checkboxLabel}>
        <input type="checkbox" checked={showGrid} onChange={toggleGrid} />
        <span>Mostrar Grid</span>
      </label>
      <label className={styles.checkboxLabel}>
        <input type="checkbox" checked={showEdges} onChange={toggleEdges} />
        <span>Mostrar Aristas</span>
      </label>
    </div>
  );
}
