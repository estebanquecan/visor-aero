import { useState } from "react";
import { useViewerStore } from "@/store/viewerStore";
import styles from "./LoadModelUrlInput.module.css";

interface LoadModelUrlInputProps {
  onOpenUrl: (url: string) => void;
}

/** Campo para cargar un modelo .3dm alojado en una URL directa (p.ej. GitHub raw). */
export function LoadModelUrlInput({ onOpenUrl }: LoadModelUrlInputProps) {
  const [url, setUrl] = useState("");
  const isLoading = useViewerStore((s) => s.isLoading);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (url.trim()) onOpenUrl(url.trim());
  };

  return (
    <form className={styles.wrap} onSubmit={handleSubmit}>
      <label className={styles.label} htmlFor="model-url">
        Cargar desde URL
      </label>
      <div className={styles.row}>
        <input
          id="model-url"
          type="url"
          className={styles.input}
          placeholder="https://raw.githubusercontent.com/..."
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="btn btn--secondary"
          disabled={isLoading || !url.trim()}
        >
          Cargar
        </button>
      </div>
      <p className={styles.hint}>
        Debe ser un enlace directo al archivo .3dm, .glb o .gltf. En GitHub,
        usa el boton &quot;Raw&quot; del archivo (no la URL de la pagina).
      </p>
    </form>
  );
}
