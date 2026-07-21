import { create } from "zustand";
import type { DisplayMode, LayerInfo, Measurement, StandardView, Theme } from "@/core/types";

/**
 * Estado global del visor.
 *
 * Contiene unicamente datos de dominio y de UI. La escena de three.js se
 * gestiona de forma imperativa dentro del Viewer y se sincroniza leyendo
 * este store (capas visibles, seleccion, tema, modo de vista, etc.).
 */

/** Peticion de vista: se incrementa un nonce para forzar la reaccion del Viewer. */
export interface ViewRequest {
  view: StandardView;
  nonce: number;
}

interface ViewerState {
  // Datos del modelo cargado
  fileName: string | null;
  layers: LayerInfo[];

  // Estado de UI
  theme: Theme;
  selectedObjectId: string | null;
  isLoading: boolean;
  error: string | null;
  viewRequest: ViewRequest | null;
  displayMode: DisplayMode;
  showGrid: boolean;
  showEdges: boolean;
  sidebarVisible: boolean;
  measureMode: boolean;
  measurements: Measurement[];

  // Acciones
  toggleTheme: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadModel: (payload: { fileName: string; layers: LayerInfo[] }) => void;
  clearModel: () => void;
  toggleLayer: (layerId: string) => void;
  selectObject: (objectId: string | null) => void;
  requestView: (view: StandardView) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  toggleGrid: () => void;
  toggleEdges: () => void;
  toggleSidebar: () => void;
  setSidebarVisible: (visible: boolean) => void;
  toggleMeasureMode: () => void;
  setMeasurements: (measurements: Measurement[]) => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  fileName: null,
  layers: [],
  theme: "light",
  selectedObjectId: null,
  isLoading: false,
  error: null,
  viewRequest: null,
  displayMode: "shaded",
  showGrid: true,
  showEdges: false,
  sidebarVisible: true,
  measureMode: false,
  measurements: [],

  toggleTheme: () =>
    set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error, isLoading: false }),

  loadModel: ({ fileName, layers }) =>
    set({
      fileName,
      layers,
      selectedObjectId: null,
      isLoading: false,
      error: null,
    }),

  clearModel: () =>
    set({
      fileName: null,
      layers: [],
      selectedObjectId: null,
      error: null,
      measurements: [],
    }),

  toggleLayer: (layerId) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l,
      ),
    })),

  selectObject: (objectId) => set({ selectedObjectId: objectId }),

  requestView: (view) =>
    set((state) => ({
      viewRequest: { view, nonce: (state.viewRequest?.nonce ?? 0) + 1 },
    })),

  setDisplayMode: (mode) => set({ displayMode: mode }),

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  toggleEdges: () => set((state) => ({ showEdges: !state.showEdges })),

  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),

  setSidebarVisible: (visible) => set({ sidebarVisible: visible }),

  toggleMeasureMode: () => set((state) => ({ measureMode: !state.measureMode })),

  setMeasurements: (measurements) => set({ measurements }),
}));
