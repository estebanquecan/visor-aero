import { useRef } from "react";
import { useViewerStore } from "@/store/viewerStore";
import styles from "./LoadModelButton.module.css";

interface LoadModelButtonProps {
  onOpenFile: (file: File) => void;
}

/** Boton + input oculto para seleccionar un archivo .3dm. */
export function LoadModelButton({ onOpenFile }: LoadModelButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isLoading = useViewerStore((s) => s.isLoading);
  const fileName = useViewerStore((s) => s.fileName);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onOpenFile(file);
    event.target.value = ""; // permite reabrir el mismo archivo
  };

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className="btn btn--primary"
        style={{ width: "100%" }}
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
      >
        {isLoading ? "Cargando..." : "Seleccionar Archivo .3dm"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".3dm"
        onChange={handleChange}
        className={styles.hiddenInput}
      />
      {fileName && (
        <span className={styles.fileName} title={fileName}>
          {fileName}
        </span>
      )}
    </div>
  );
}
