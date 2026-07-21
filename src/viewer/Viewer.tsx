import { useEffect, useRef } from "react";
import { ViewerScene } from "./ViewerScene";
import { useViewerStore } from "@/store/viewerStore";
import styles from "./Viewer.module.css";

interface ViewerProps {
  /** Recibe el motor de escena una vez inicializado (para carga de modelos). */
  onSceneReady: (scene: ViewerScene) => void;
}

/**
 * Contenedor React del visor 3D. Crea el `ViewerScene` imperativo y lo mantiene
 * sincronizado con el store (capas, seleccion, tema, vistas y modo de vista).
 */
export function Viewer({ onSceneReady }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ViewerScene | null>(null);

  const layers = useViewerStore((s) => s.layers);
  const selectedObjectId = useViewerStore((s) => s.selectedObjectId);
  const viewRequest = useViewerStore((s) => s.viewRequest);
  const displayMode = useViewerStore((s) => s.displayMode);
  const theme = useViewerStore((s) => s.theme);
  const showGrid = useViewerStore((s) => s.showGrid);
  const showEdges = useViewerStore((s) => s.showEdges);
  const measureMode = useViewerStore((s) => s.measureMode);
  const selectObject = useViewerStore((s) => s.selectObject);
  const setMeasurements = useViewerStore((s) => s.setMeasurements);

  // Inicializacion / limpieza del motor de escena.
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new ViewerScene(containerRef.current, {
      onSelect: (objectId) => selectObject(objectId),
      onMeasurementsChange: (measurements) => setMeasurements(measurements),
    });
    sceneRef.current = scene;
    onSceneReady(scene);

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // Solo debe ejecutarse una vez al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    for (const layer of layers) {
      scene.setLayerVisibility(layer.id, layer.visible);
    }
  }, [layers]);

  useEffect(() => {
    sceneRef.current?.select(selectedObjectId);
  }, [selectedObjectId]);

  useEffect(() => {
    if (viewRequest) sceneRef.current?.applyView(viewRequest.view);
  }, [viewRequest]);

  useEffect(() => {
    sceneRef.current?.setDisplayMode(displayMode);
  }, [displayMode]);

  useEffect(() => {
    sceneRef.current?.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    sceneRef.current?.setShowGrid(showGrid);
  }, [showGrid]);

  useEffect(() => {
    sceneRef.current?.setShowEdges(showEdges);
  }, [showEdges]);

  useEffect(() => {
    sceneRef.current?.setMeasureMode(measureMode);
  }, [measureMode]);

  return <div ref={containerRef} className={styles.viewer} />;
}
