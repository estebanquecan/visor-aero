import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import type { LoadedModel } from "./rhinoLoader";
import type { LayerInfo } from "./types";

/** Ruta publica donde se auto-hospeda el decodificador Draco (para .glb comprimidos). */
const DRACO_DECODER_PATH = "/draco/";

const LAYER_COLORS = [
  "#4a90d9",
  "#e07a5f",
  "#81b29a",
  "#f2cc8f",
  "#9d8ce0",
  "#e0a5c8",
  "#7fa650",
  "#d9a441",
];

function colorForIndex(index: number): string {
  return LAYER_COLORS[index % LAYER_COLORS.length];
}

let loaderInstance: GLTFLoader | null = null;

function getLoader(): GLTFLoader {
  if (!loaderInstance) {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    loaderInstance = new GLTFLoader();
    loaderInstance.setDRACOLoader(dracoLoader);
  }
  return loaderInstance;
}

/**
 * Parsea un archivo .glb/.gltf y produce un modelo listo para el visor.
 *
 * A diferencia de .3dm, glTF no tiene un concepto nativo de "capas": se
 * reconstruye una capa por cada grupo nombrado de primer nivel de la escena
 * (asi es como los exportadores de Rhino suelen representar las capas). Las
 * mallas sueltas que no estan dentro de ningun grupo se agrupan bajo una
 * capa generica "Modelo".
 *
 * @param buffer contenido binario del archivo .glb/.gltf
 */
export async function loadGlbModel(buffer: ArrayBuffer): Promise<LoadedModel> {
  const loader = getLoader();

  const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
    loader.parse(buffer, "", (result) => resolve(result as unknown as { scene: THREE.Group }), reject);
  });

  const group = gltf.scene;
  const layers: LayerInfo[] = [];
  const objectMap = new Map<string, THREE.Object3D>();

  const groupNodes: THREE.Object3D[] = [];
  const looseMeshes: THREE.Object3D[] = [];
  group.children.forEach((node) => {
    if (node instanceof THREE.Mesh) looseMeshes.push(node);
    else groupNodes.push(node);
  });

  const assignLayer = (root: THREE.Object3D, layerId: string) => {
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const id = child.uuid;
      child.userData.objectId = id;
      child.userData.layerId = layerId;
      objectMap.set(id, child);
    });
  };

  groupNodes.forEach((node, index) => {
    const layerId = `layer-${index}`;
    layers.push({
      id: layerId,
      name: node.name || `Capa ${index + 1}`,
      color: colorForIndex(index),
      visible: true,
    });
    assignLayer(node, layerId);
  });

  if (looseMeshes.length > 0) {
    const layerId = "layer-modelo";
    layers.push({
      id: layerId,
      name: "Modelo",
      color: colorForIndex(groupNodes.length),
      visible: true,
    });
    looseMeshes.forEach((mesh) => assignLayer(mesh, layerId));
  }

  return { group, layers, objectMap };
}
