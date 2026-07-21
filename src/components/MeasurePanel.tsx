import { useViewerStore } from "@/store/viewerStore";
import styles from "./MeasurePanel.module.css";

interface MeasurePanelProps {
  onRemoveMeasurement: (id: string) => void;
  onClearMeasurements: () => void;
}

/** Herramienta de medicion de distancia punto-a-punto sobre el modelo. */
export function MeasurePanel({ onRemoveMeasurement, onClearMeasurements }: MeasurePanelProps) {
  const measureMode = useViewerStore((s) => s.measureMode);
  const measurements = useViewerStore((s) => s.measurements);
  const toggleMeasureMode = useViewerStore((s) => s.toggleMeasureMode);

  return (
    <div>
      <button
        type="button"
        className={`${styles.toggleBtn} ${measureMode ? styles.active : ""}`}
        onClick={toggleMeasureMode}
      >
        {measureMode ? "Medicion activa" : "Activar Medicion"}
      </button>

      {measureMode && (
        <p className={styles.hint}>
          Clic en dos puntos del modelo para medir la distancia. Esc cancela el punto pendiente.
        </p>
      )}

      {measurements.length === 0 ? (
        <p className={styles.empty}>Sin mediciones</p>
      ) : (
        <ul className={styles.list}>
          {measurements.map((m, i) => (
            <li key={m.id} className={styles.item}>
              <span className={styles.index}>{i + 1}</span>
              <span className={styles.distance}>{m.distance.toFixed(3)}</span>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => onRemoveMeasurement(m.id)}
                aria-label="Eliminar medicion"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {measurements.length > 0 && (
        <button type="button" className={styles.clearBtn} onClick={onClearMeasurements}>
          Limpiar Todo
        </button>
      )}
    </div>
  );
}
