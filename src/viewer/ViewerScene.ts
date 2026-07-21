import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { DisplayMode, Measurement, StandardView, Theme } from "@/core/types";
import type { LoadedModel } from "@/core/rhinoLoader";

/**
 * Motor de escena imperativo del Visor.
 *
 * Encapsula toda la interaccion con three.js (render, camara, controles,
 * seleccion, capas, tema y modos de visualizacion) detras de una API pequena
 * y estable que consume el componente React `Viewer`.
 *
 * Nota de estabilidad: la geometria llega ya parseada por el Rhino3dmLoader
 * oficial (que corre en un Web Worker), fusionada por objeto. Este motor solo
 * gestiona materiales y overlays (aristas, seleccion), y libera siempre la
 * geometria/materiales anteriores antes de cargar un modelo nuevo o al
 * destruirse, para evitar fugas de memoria con archivos grandes.
 *
 * Nota de coordenadas: los archivos de Rhino son Z-up, y el Rhino3dmLoader
 * conserva esa orientacion. Por eso la camara y los controles usan Z como
 * vertical.
 */

export type SelectionHandler = (objectId: string | null) => void;
export type MeasurementsHandler = (measurements: Measurement[]) => void;

export interface ViewerSceneCallbacks {
  onSelect: SelectionHandler;
  onMeasurementsChange: MeasurementsHandler;
}

const THEME_COLORS: Record<Theme, { bg: number; bgRendered: number; grid: number }> = {
  light: { bg: 0xf5f5f5, bgRendered: 0xffffff, grid: 0xe0e0e0 },
  dark: { bg: 0x0f0f0f, bgRendered: 0x0f0f0f, grid: 0x2a2a2a },
};

const SELECTION_COLOR = new THREE.Color(0xffa500);
const EDGE_COLOR = 0x000000;
const EDGE_THRESHOLD_ANGLE = 20;
const MEASURE_COLOR = 0x2f6fed;

interface MeshEntry {
  mesh: THREE.Mesh;
  baseColor: THREE.Color;
  edges: THREE.LineSegments;
}

interface MeasurementEntry {
  id: string;
  a: THREE.Vector3;
  b: THREE.Vector3;
  distance: number;
  line: THREE.Line;
  markerA: THREE.Mesh;
  markerB: THREE.Mesh;
  label: THREE.Sprite;
}

export class ViewerScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private grid: THREE.GridHelper;
  private ambientLight: THREE.AmbientLight;
  private keyLight: THREE.DirectionalLight;
  private shadowGround: THREE.Mesh;

  private modelGroup: THREE.Group | null = null;
  private objectMap = new Map<string, THREE.Object3D>();
  private meshEntries = new Map<string, MeshEntry>();
  private selectableObjects: THREE.Object3D[] = [];

  private theme: Theme = "light";
  private displayMode: DisplayMode = "shaded";
  private showGrid = true;
  private showEdges = false;

  private selectedId: string | null = null;

  private modelBox = new THREE.Box3();
  private modelCenter = new THREE.Vector3();
  private modelRadius = 1;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private measureGroup: THREE.Group;
  private measureMode = false;
  private pendingPoint: THREE.Vector3 | null = null;
  private pendingMarker: THREE.Mesh | null = null;
  private measurements = new Map<string, MeasurementEntry>();
  private measureIdCounter = 0;

  private onSelect: SelectionHandler;
  private onMeasurementsChange: MeasurementsHandler;
  private resizeObserver: ResizeObserver;
  private frameId = 0;
  private disposed = false;

  constructor(container: HTMLElement, callbacks: ViewerSceneCallbacks) {
    this.onSelect = callbacks.onSelect;
    this.onMeasurementsChange = callbacks.onMeasurementsChange;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Escena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(THEME_COLORS.light.bg);

    // Camara (Z-up)
    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.01,
      100000,
    );
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(30, -30, 25);

    // Controles
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;

    // Iluminacion
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.keyLight.position.set(50, -50, 60);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 1000;
    this.keyLight.shadow.bias = -0.0001;
    this.scene.add(this.keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
    fillLight.position.set(-40, 30, 20);
    this.scene.add(fillLight);

    // Suelo de sombras (solo visible en modo Rendered)
    this.shadowGround = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.ShadowMaterial({ opacity: 0.25 }),
    );
    this.shadowGround.receiveShadow = true;
    this.shadowGround.visible = false;
    this.scene.add(this.shadowGround);

    // Rejilla de referencia sobre el plano XY
    this.grid = new THREE.GridHelper(200, 50, THEME_COLORS.light.grid, THEME_COLORS.light.grid);
    this.grid.rotation.x = Math.PI / 2; // XZ -> XY (Z-up)
    (this.grid.material as THREE.Material).transparent = true;
    (this.grid.material as THREE.Material).opacity = 0.6;
    this.scene.add(this.grid);

    // Grupo de mediciones (lineas, marcadores y etiquetas)
    this.measureGroup = new THREE.Group();
    this.scene.add(this.measureGroup);

    // Redimensionado reactivo
    this.resizeObserver = new ResizeObserver(() => this.handleResize(container));
    this.resizeObserver.observe(container);

    const dom = this.renderer.domElement;
    dom.addEventListener("pointermove", this.handlePointerMove);
    dom.addEventListener("pointerdown", this.handlePointerDown);
    window.addEventListener("keydown", this.handleKeyDown);

    this.animate();
  }

  // --- Ciclo de render ---

  private animate = () => {
    if (this.disposed) return;
    this.frameId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private handleResize(container: HTMLElement) {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // --- Modelo ---

  setModel(model: LoadedModel) {
    this.clearModel();

    this.modelGroup = model.group;
    this.objectMap = model.objectMap;
    this.scene.add(model.group);

    this.selectableObjects = [];
    model.objectMap.forEach((object, id) => {
      this.selectableObjects.push(object);

      if (object instanceof THREE.Mesh) {
        const original = object.material as THREE.Material & {
          color?: THREE.Color;
        };
        const baseColor = original.color
          ? original.color.clone()
          : new THREE.Color(0xaaaaaa);
        original.dispose?.();

        const edgesGeometry = new THREE.EdgesGeometry(
          object.geometry,
          EDGE_THRESHOLD_ANGLE,
        );
        const edges = new THREE.LineSegments(
          edgesGeometry,
          new THREE.LineBasicMaterial({ color: EDGE_COLOR }),
        );
        edges.visible = this.showEdges;
        edges.renderOrder = 1;
        object.add(edges);

        object.castShadow = true;
        object.receiveShadow = true;

        this.meshEntries.set(id, { mesh: object, baseColor, edges });
        object.material = this.buildMaterial(baseColor);
      }
    });

    this.applyDisplayModeLighting();
    this.updateModelBounds();
    this.applyView("perspective");
    this.adaptGrid();
  }

  clearModel() {
    this.selectedId = null;
    this.meshEntries.clear();
    if (this.modelGroup) {
      this.scene.remove(this.modelGroup);
      this.disposeObject(this.modelGroup);
      this.modelGroup = null;
    }
    this.objectMap.clear();
    this.selectableObjects = [];
    this.modelBox.makeEmpty();
    this.clearMeasurements();
  }

  private updateModelBounds() {
    if (this.modelGroup) {
      this.modelBox.setFromObject(this.modelGroup);
    } else {
      this.modelBox.makeEmpty();
    }

    if (this.modelBox.isEmpty()) {
      this.modelCenter.set(0, 0, 0);
      this.modelRadius = 10;
      return;
    }

    this.modelBox.getCenter(this.modelCenter);
    const size = new THREE.Vector3();
    this.modelBox.getSize(size);
    this.modelRadius = Math.max(size.length() * 0.5, 0.5);

    this.shadowGround.position.set(this.modelCenter.x, this.modelCenter.y, this.modelBox.min.z - 0.01);
  }

  /** Ajusta el tamano de la rejilla al modelo cargado. */
  private adaptGrid() {
    if (this.modelBox.isEmpty()) return;
    const size = new THREE.Vector3();
    this.modelBox.getSize(size);
    const span = Math.max(size.x, size.y, 10);

    const colors = THEME_COLORS[this.theme];
    this.scene.remove(this.grid);
    (this.grid.material as THREE.Material).dispose();
    this.grid = new THREE.GridHelper(span * 2.5, 50, colors.grid, colors.grid);
    this.grid.rotation.x = Math.PI / 2;
    this.grid.position.set(this.modelCenter.x, this.modelCenter.y, this.modelBox.min.z);
    (this.grid.material as THREE.Material).transparent = true;
    (this.grid.material as THREE.Material).opacity = 0.6;
    this.grid.visible = this.showGrid;
    this.scene.add(this.grid);
  }

  // --- Tema ---

  setTheme(theme: Theme) {
    if (theme === this.theme) return;
    this.theme = theme;
    this.updateSceneColors();
  }

  private updateSceneColors() {
    const colors = THEME_COLORS[this.theme];
    this.scene.background = new THREE.Color(
      this.displayMode === "rendered" ? colors.bgRendered : colors.bg,
    );
    (this.grid.material as THREE.Material as THREE.LineBasicMaterial).color.setHex(
      colors.grid,
    );
  }

  // --- Capas ---

  setLayerVisibility(layerId: string, visible: boolean) {
    this.objectMap.forEach((object) => {
      if (object.userData.layerId === layerId) {
        object.visible = visible;
      }
    });
  }

  // --- Grid / aristas ---

  setShowGrid(visible: boolean) {
    this.showGrid = visible;
    this.grid.visible = visible;
  }

  setShowEdges(visible: boolean) {
    this.showEdges = visible;
    this.meshEntries.forEach((entry) => {
      entry.edges.visible = visible;
    });
  }

  // --- Modo de visualizacion ---

  setDisplayMode(mode: DisplayMode) {
    if (mode === this.displayMode) return;
    this.displayMode = mode;

    this.meshEntries.forEach((entry) => {
      const isSelected = entry.mesh.userData.objectId === this.selectedId;
      const color = isSelected ? SELECTION_COLOR : entry.baseColor;
      const oldMaterial = entry.mesh.material as THREE.Material;
      entry.mesh.material = this.buildMaterial(color);
      oldMaterial.dispose();
    });

    this.applyDisplayModeLighting();
    this.updateSceneColors();
  }

  private buildMaterial(color: THREE.Color): THREE.MeshStandardMaterial {
    switch (this.displayMode) {
      case "rendered":
        return new THREE.MeshStandardMaterial({
          color,
          roughness: 0.4,
          metalness: 0.1,
          side: THREE.DoubleSide,
        });
      case "ghosted":
        return new THREE.MeshStandardMaterial({
          color,
          roughness: 0.6,
          metalness: 0,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
      case "shaded":
      default:
        return new THREE.MeshStandardMaterial({
          color,
          roughness: 0.8,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });
    }
  }

  private applyDisplayModeLighting() {
    const rendered = this.displayMode === "rendered";
    this.shadowGround.visible = rendered;
    this.keyLight.intensity = rendered ? 1.1 : 0.8;
    this.ambientLight.intensity = rendered ? 0.4 : 0.6;
  }

  // --- Interaccion de puntero ---

  private handlePointerMove = (event: PointerEvent) => {
    this.updatePointer(event);
    const hit = this.intersectTop();
    if (this.measureMode) {
      this.renderer.domElement.style.cursor = hit ? "crosshair" : "default";
      return;
    }
    this.renderer.domElement.style.cursor = hit ? "pointer" : "default";
  };

  private handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;

    const onUp = (up: PointerEvent) => {
      window.removeEventListener("pointerup", onUp);
      const moved = Math.hypot(up.clientX - startX, up.clientY - startY);
      if (moved > 4) return; // fue un arrastre, no un clic
      this.updatePointer(up);

      if (this.measureMode) {
        this.handleMeasureClick();
        return;
      }

      const hit = this.intersectTop();
      const id = hit?.object.userData.objectId as string | undefined;
      this.select(id ?? null);
      this.onSelect(id ?? null);
    };
    window.addEventListener("pointerup", onUp);
  };

  private updatePointer(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private intersectTop(): THREE.Intersection | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const visible = this.selectableObjects.filter((o) => o.visible);
    const hits = this.raycaster.intersectObjects(visible, false);
    return hits.length > 0 ? hits[0] : null;
  }

  // --- Seleccion ---

  select(objectId: string | null) {
    if (objectId === this.selectedId) return;

    if (this.selectedId) {
      const prev = this.meshEntries.get(this.selectedId);
      if (prev) {
        (prev.mesh.material as THREE.MeshStandardMaterial).color.copy(prev.baseColor);
      }
    }

    this.selectedId = objectId;
    if (!objectId) return;

    const entry = this.meshEntries.get(objectId);
    if (entry) {
      (entry.mesh.material as THREE.MeshStandardMaterial).color.copy(SELECTION_COLOR);
    }
  }

  // --- Medicion ---

  setMeasureMode(active: boolean) {
    if (active === this.measureMode) return;
    this.measureMode = active;
    if (!active) {
      this.clearPendingMarker();
      this.renderer.domElement.style.cursor = "default";
    }
  }

  removeMeasurement(id: string) {
    const entry = this.measurements.get(id);
    if (!entry) return;
    this.disposeMeasurementEntry(entry);
    this.measurements.delete(id);
    this.emitMeasurements();
  }

  clearMeasurements() {
    this.clearPendingMarker();
    this.measurements.forEach((entry) => this.disposeMeasurementEntry(entry));
    this.measurements.clear();
    this.emitMeasurements();
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && this.pendingPoint) {
      this.clearPendingMarker();
    }
  };

  private handleMeasureClick() {
    const hit = this.intersectTop();
    if (!hit) return;
    const point = hit.point.clone();

    if (!this.pendingPoint) {
      this.pendingPoint = point;
      this.pendingMarker = this.createMarker(point, MEASURE_COLOR);
      this.measureGroup.add(this.pendingMarker);
      return;
    }

    this.createMeasurement(this.pendingPoint, point);
    this.clearPendingMarker();
  }

  private createMeasurement(a: THREE.Vector3, b: THREE.Vector3) {
    const distance = a.distanceTo(b);
    const id = `m-${++this.measureIdCounter}`;

    const markerA = this.createMarker(a, MEASURE_COLOR);
    const markerB = this.createMarker(b, MEASURE_COLOR);

    const lineGeometry = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(
      lineGeometry,
      new THREE.LineBasicMaterial({ color: MEASURE_COLOR, depthTest: false }),
    );
    line.renderOrder = 2;

    const mid = a.clone().add(b).multiplyScalar(0.5);
    const label = this.createLabelSprite(`${distance.toFixed(3)}`);
    label.position.copy(mid);

    this.measureGroup.add(markerA, markerB, line, label);

    this.measurements.set(id, { id, a: a.clone(), b: b.clone(), distance, line, markerA, markerB, label });
    this.emitMeasurements();
  }

  private createMarker(point: THREE.Vector3, color: number): THREE.Mesh {
    const size = Math.max(this.modelRadius * 0.008, 0.02);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(size, 12, 12),
      new THREE.MeshBasicMaterial({ color, depthTest: false }),
    );
    marker.position.copy(point);
    marker.renderOrder = 2;
    return marker;
  }

  private createLabelSprite(text: string): THREE.Sprite {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const fontSize = 48;
    ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
    const padding = 16;
    const textWidth = ctx.measureText(text).width;
    canvas.width = textWidth + padding * 2;
    canvas.height = fontSize + padding * 2;

    ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(17, 17, 17, 0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.renderOrder = 3;

    const scale = Math.max(this.modelRadius * 0.06, 0.15);
    sprite.scale.set(scale * (canvas.width / canvas.height), scale, 1);
    return sprite;
  }

  private clearPendingMarker() {
    if (this.pendingMarker) {
      this.measureGroup.remove(this.pendingMarker);
      this.pendingMarker.geometry.dispose();
      (this.pendingMarker.material as THREE.Material).dispose();
      this.pendingMarker = null;
    }
    this.pendingPoint = null;
  }

  private disposeMeasurementEntry(entry: MeasurementEntry) {
    this.measureGroup.remove(entry.line, entry.markerA, entry.markerB, entry.label);
    entry.line.geometry.dispose();
    (entry.line.material as THREE.Material).dispose();
    entry.markerA.geometry.dispose();
    (entry.markerA.material as THREE.Material).dispose();
    entry.markerB.geometry.dispose();
    (entry.markerB.material as THREE.Material).dispose();
    (entry.label.material as THREE.SpriteMaterial).map?.dispose();
    (entry.label.material as THREE.Material).dispose();
  }

  private emitMeasurements() {
    const list: Measurement[] = Array.from(this.measurements.values()).map((entry) => ({
      id: entry.id,
      distance: entry.distance,
      a: [entry.a.x, entry.a.y, entry.a.z],
      b: [entry.b.x, entry.b.y, entry.b.z],
    }));
    this.onMeasurementsChange(list);
  }

  // --- Vistas rapidas ---

  applyView(view: StandardView) {
    const center = this.modelCenter;
    const distance = this.modelRadius * 2.2;

    let dir: THREE.Vector3;
    let up: THREE.Vector3;

    switch (view) {
      case "top":
        dir = new THREE.Vector3(0, 0, 1);
        up = new THREE.Vector3(0, 1, 0);
        break;
      case "front":
        dir = new THREE.Vector3(0, -1, 0);
        up = new THREE.Vector3(0, 0, 1);
        break;
      case "right":
        dir = new THREE.Vector3(1, 0, 0);
        up = new THREE.Vector3(0, 0, 1);
        break;
      case "perspective":
      default:
        dir = new THREE.Vector3(1, -1, 0.8).normalize();
        up = new THREE.Vector3(0, 0, 1);
        break;
    }

    this.camera.up.copy(up);
    this.camera.position.copy(center).addScaledVector(dir, distance);
    this.controls.target.copy(center);
    this.camera.lookAt(center);
    this.controls.update();
  }

  // --- Limpieza ---

  private disposeObject(root: THREE.Object3D) {
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      const materials = Array.isArray(material) ? material : material ? [material] : [];
      for (const m of materials) {
        const map = (m as THREE.SpriteMaterial).map;
        if (map) map.dispose();
        m.dispose();
      }
    });
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    const dom = this.renderer.domElement;
    dom.removeEventListener("pointermove", this.handlePointerMove);
    dom.removeEventListener("pointerdown", this.handlePointerDown);
    window.removeEventListener("keydown", this.handleKeyDown);
    this.clearModel();
    this.controls.dispose();
    this.renderer.dispose();
    dom.remove();
  }
}
