import { useViewerStore } from "@/store/viewerStore";
import styles from "./LayerPanel.module.css";

/** Lista de capas del modelo cargado, con color y control de visibilidad. */
export function LayerPanel() {
  const layers = useViewerStore((s) => s.layers);
  const toggleLayer = useViewerStore((s) => s.toggleLayer);

  if (layers.length === 0) {
    return <p className={styles.empty}>No hay capas</p>;
  }

  return (
    <ul className={styles.list}>
      {layers.map((layer) => (
        <li key={layer.id} className={styles.item}>
          <label className={styles.row}>
            <span
              className={styles.swatch}
              style={{ backgroundColor: layer.color }}
              aria-hidden
            />
            <span className={styles.name} title={layer.name}>
              {layer.name}
            </span>
            <span
              role="switch"
              aria-checked={layer.visible}
              tabIndex={0}
              className={`${styles.switch} ${layer.visible ? styles.active : ""}`}
              onClick={() => toggleLayer(layer.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") toggleLayer(layer.id);
              }}
            />
          </label>
        </li>
      ))}
    </ul>
  );
}
