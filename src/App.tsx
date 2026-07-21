import { useCallback, useEffect, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { SidebarToggleFloating } from "@/components/SidebarToggleFloating";
import { Watermark } from "@/components/Watermark";
import { Viewer } from "@/viewer/Viewer";
import type { ViewerScene } from "@/viewer/ViewerScene";
import { openModelFile, openModelFromUrl } from "@/core/openModel";
import { useViewerStore } from "@/store/viewerStore";
import styles from "./App.module.css";

/**
 * Composicion principal del Visor.
 *
 * Estructura: panel lateral colapsable a la izquierda + area de visor 3D.
 * El motor de escena se conserva en una ref para conectar la apertura de
 * archivos con el render sin acoplar los paneles entre si.
 */
export default function App() {
  const sceneRef = useRef<ViewerScene | null>(null);

  const theme = useViewerStore((s) => s.theme);
  const error = useViewerStore((s) => s.error);
  const isLoading = useViewerStore((s) => s.isLoading);
  const hasModel = useViewerStore((s) => s.fileName !== null);

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  const handleOpenFile = useCallback((file: File) => {
    if (sceneRef.current) void openModelFile(file, sceneRef.current);
  }, []);

  const handleOpenUrl = useCallback((url: string) => {
    if (sceneRef.current) void openModelFromUrl(url, sceneRef.current);
  }, []);

  const handleSceneReady = useCallback((scene: ViewerScene) => {
    sceneRef.current = scene;
  }, []);

  const handleRemoveMeasurement = useCallback((id: string) => {
    sceneRef.current?.removeMeasurement(id);
  }, []);

  const handleClearMeasurements = useCallback(() => {
    sceneRef.current?.clearMeasurements();
  }, []);

  return (
    <div className={styles.app}>
      <Sidebar
        onOpenFile={handleOpenFile}
        onOpenUrl={handleOpenUrl}
        onRemoveMeasurement={handleRemoveMeasurement}
        onClearMeasurements={handleClearMeasurements}
      />

      <main className={styles.stage}>
        <Viewer onSceneReady={handleSceneReady} />
        <SidebarToggleFloating />
        <Watermark />

        {isLoading && (
          <div className={styles.overlay}>
            <div className={styles.loadingCard}>
              <div className={styles.spinner} />
              <p>Cargando modelo...</p>
            </div>
          </div>
        )}

        {!hasModel && !isLoading && (
          <div className={styles.overlay}>
            <div className={styles.overlayCard}>
              <h1 className={styles.overlayTitle}>Visor 3D Rhino</h1>
              <p className={styles.overlayText}>
                Abre un archivo .3dm para inspeccionar la guia de armado.
              </p>
            </div>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </main>
    </div>
  );
}
