import type { Model3D } from "@/core/models";
import { useViewerStore } from "@/store/viewerStore";
import styles from "./ModelCard.module.css";

interface ModelCardProps {
  model: Model3D;
  onOpenUrl: (url: string) => void;
}

/** Fila de un modelo de la biblioteca: nombre y categoria, clic para verlo en el visor. */
export function ModelCard({ model, onOpenUrl }: ModelCardProps) {
  const isLoading = useViewerStore((s) => s.isLoading);

  return (
    <button
      type="button"
      className={styles.row}
      onClick={() => onOpenUrl(model.viewer)}
      disabled={isLoading}
      title={`Ver ${model.name}`}
    >
      <span className={styles.info}>
        <span className={styles.name}>{model.name}</span>
        {model.category && <span className={styles.category}>{model.category}</span>}
      </span>
      <span className={styles.action}>Ver modelo →</span>
    </button>
  );
}
