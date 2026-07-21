import * as THREE from "three";
import { Rhino3dmLoader } from "three/examples/jsm/loaders/3DMLoader.js";
import type { LayerInfo } from "./types";

/**
 * Ruta publica donde se auto-hospedan rhino3dm.js y rhino3dm.wasm.
 *
 * Usar el Rhino3dmLoader oficial de three.js es la base de la estabilidad de
 * este visor: parsea el archivo dentro de un Web Worker (no bloquea el hilo
 * principal) y produce geometria ya fusionada por objeto, en vez de crear un
 * THREE.Mesh independiente por cada cara de cada Brep.
 */
const RHINO_LIBRARY_PATH = "/rhino3dm/";

/** Resultado del parseo de un archivo .3dm. */
export interface LoadedModel {
  /** Grupo raiz con toda la geometria lista para anadir a la escena. */
  group: THREE.Group;
  layers: LayerInfo[];
  /** Mapa objectId -> Object3D, para seleccion y control de visibilidad. */
  objectMap: Map<string, THREE.Object3D>;
}

interface RhinoColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

function toCssColor(color: RhinoColor | undefined, fallback = "#8a8a8a"): string {
  if (!color) return fallback;
  const hex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`;
}

let loaderInstance: Rhino3dmLoader | null = null;

function getLoader(): Rhino3dmLoader {
  if (!loaderInstance) {
    loaderInstance = new Rhino3dmLoader();
    loaderInstance.setLibraryPath(RHINO_LIBRARY_PATH);
  }
  return loaderInstance;
}

/**
 * Parsea un archivo .3dm y produce un modelo listo para el visor.
 *
 * @param buffer contenido binario del archivo .3dm
 */
export async function loadRhinoModel(buffer: ArrayBuffer): Promise<LoadedModel> {
  const loader = getLoader();

  const group = await new Promise<THREE.Group>((resolve, reject) => {
    loader.parse(buffer, (object) => resolve(object as THREE.Group), reject);
  });

  // Capas del documento (mismo orden de indice que usa layerIndex).
  const rawLayers = (group.userData.layers ?? []) as Array<{
    id?: string;
    name?: string;
    fullPath?: string;
    color?: RhinoColor;
    visible?: boolean;
  }>;

  const layers: LayerInfo[] = rawLayers.map((l, index) => ({
    id: l.id ?? `layer-${index}`,
    name: l.fullPath || l.name || `Capa ${index + 1}`,
    color: toCssColor(l.color),
    visible: l.visible !== false,
  }));

  const layerIdByIndex = new Map<number, string>();
  layers.forEach((layer, index) => layerIdByIndex.set(index, layer.id));

  const objectMap = new Map<string, THREE.Object3D>();
  let anonymousCount = 0;

  group.traverse((child) => {
    const attributes = child.userData.attributes as
      | { id?: string; layerIndex?: number }
      | undefined;

    // Solo los nodos con atributos de Rhino son objetos seleccionables.
    if (!attributes) return;

    const id = attributes.id ?? `object-${anonymousCount++}`;
    const layerIndex = attributes.layerIndex ?? -1;
    const layerId = layerIdByIndex.get(layerIndex) ?? layers[0]?.id ?? "layer-0";

    child.userData.objectId = id;
    child.userData.layerId = layerId;

    objectMap.set(id, child);
  });

  return { group, layers, objectMap };
}
