import { useEffect, useState } from "react";
import { loadModels, type Model3D } from "@/core/models";
import { ModelCard } from "./ModelCard";
import styles from "./ModelGallery.module.css";

interface ModelGalleryProps {
  onOpenUrl: (url: string) => void;
}

type Status = "loading" | "ready" | "error";

/** Galeria de modelos generada automaticamente desde el catalogo local (models.json). */
export function ModelGallery({ onOpenUrl }: ModelGalleryProps) {
  const [models, setModels] = useState<Model3D[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadModels()
      .then((list) => {
        if (cancelled) return;
        setModels(list);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "No se pudo cargar el catalogo de modelos",
        );
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return <p className={styles.empty}>Cargando catalogo...</p>;
  }

  if (status === "error") {
    return <p className={styles.empty}>{error}</p>;
  }

  if (models.length === 0) {
    return <p className={styles.empty}>Sin modelos publicados todavia</p>;
  }

  return (
    <div className={styles.list}>
      {models.map((model) => (
        <ModelCard key={model.id} model={model} onOpenUrl={onOpenUrl} />
      ))}
    </div>
  );
}
