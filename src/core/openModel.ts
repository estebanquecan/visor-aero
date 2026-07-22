import { loadRhinoModel } from "./rhinoLoader";
import { loadGlbModel } from "./glbLoader";
import { useViewerStore } from "@/store/viewerStore";
import type { ViewerScene } from "@/viewer/ViewerScene";

const GLB_EXTENSIONS = [".glb", ".gltf"];
export const SUPPORTED_EXTENSIONS = [".3dm", ...GLB_EXTENSIONS];

function isGlbFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return GLB_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Parsea el buffer, lo carga en la escena y publica sus metadatos en el store. */
async function loadModelBuffer(
  fileName: string,
  buffer: ArrayBuffer,
  scene: ViewerScene,
): Promise<void> {
  const store = useViewerStore.getState();
  const model = isGlbFile(fileName)
    ? await loadGlbModel(buffer)
    : await loadRhinoModel(buffer);
  scene.setModel(model);
  store.loadModel({ fileName, layers: model.layers });
}

/**
 * Orquesta la apertura de un archivo .3dm local: lo parsea, lo carga en la
 * escena y publica sus metadatos en el store. Centraliza el flujo para que la
 * UI solo tenga que entregar el `File` y el motor de escena.
 */
export async function openModelFile(
  file: File,
  scene: ViewerScene,
): Promise<void> {
  const store = useViewerStore.getState();

  const lowerName = file.name.toLowerCase();
  if (!SUPPORTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    store.setError("El archivo debe tener extension .3dm, .glb o .gltf");
    return;
  }

  store.setLoading(true);
  store.setError(null);

  try {
    const buffer = await file.arrayBuffer();
    await loadModelBuffer(file.name, buffer, scene);
  } catch (error) {
    console.error("[Visor] Error al cargar el modelo:", error);
    store.setError(
      error instanceof Error
        ? error.message
        : "No se pudo cargar el archivo .3dm",
    );
  }
}

/**
 * Orquesta la apertura de un archivo .3dm alojado remotamente (por ejemplo,
 * un enlace "raw" de GitHub). Requiere que el host permita CORS, ya que el
 * fetch se hace directamente desde el navegador.
 */
export async function openModelFromUrl(
  url: string,
  scene: ViewerScene,
): Promise<void> {
  const store = useViewerStore.getState();
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    store.setError("Ingresa una URL valida");
    return;
  }

  store.setLoading(true);
  store.setError(null);

  try {
    const response = await fetch(trimmedUrl);
    if (!response.ok) {
      throw new Error(`El servidor respondio con estado ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const lastSegment = trimmedUrl.split("/").pop()?.split("?")[0] ?? "";
    const fileName = decodeURIComponent(lastSegment) || "modelo-remoto.3dm";

    await loadModelBuffer(fileName, buffer, scene);
  } catch (error) {
    console.error("[Visor] Error al cargar el modelo desde URL:", error);
    const isNetworkError = error instanceof TypeError;
    store.setError(
      isNetworkError
        ? "No se pudo descargar el archivo. Verifica que la URL sea un enlace directo y que el servidor permita acceso desde el navegador (CORS)."
        : error instanceof Error
          ? error.message
          : "No se pudo cargar el archivo .3dm",
    );
  }
}
