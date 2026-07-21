import { useState } from "react";
import type { Model3D } from "@/core/models";
import { useViewerStore } from "@/store/viewerStore";
import styles from "./ModelCard.module.css";

interface ModelCardProps {
  model: Model3D;
  onOpenUrl: (url: string) => void;
}

/** Tarjeta de un modelo de la biblioteca: portada, metadatos y acciones. */
export function ModelCard({ model, onOpenUrl }: ModelCardProps) {
  const isLoading = useViewerStore((s) => s.isLoading);
  const [thumbFailed, setThumbFailed] = useState(false);

  return (
    <article className={styles.card}>
      <button
        type="button"
        className={styles.thumbBtn}
        onClick={() => onOpenUrl(model.viewer)}
        disabled={isLoading}
        title={`Ver ${model.name}`}
      >
        {thumbFailed ? (
          <div className={styles.thumbFallback}>{model.name}</div>
        ) : (
          <img
            src={model.thumbnail}
            alt={model.name}
            className={styles.thumb}
            loading="lazy"
            onError={() => setThumbFailed(true)}
          />
        )}
      </button>

      <div className={styles.info}>
        <h3 className={styles.name} title={model.name}>
          {model.name}
        </h3>
        <p className={styles.category}>{model.category}</p>
        {model.description && (
          <p className={styles.description}>{model.description}</p>
        )}
        {model.tags.length > 0 && (
          <div className={styles.tags}>
            {model.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <a className={styles.downloadBtn} href={model.download} download>
        Descargar Rhino (.3dm)
      </a>
    </article>
  );
}
