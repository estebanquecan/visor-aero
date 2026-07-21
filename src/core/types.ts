/**
 * Tipos de dominio del Visor.
 * Independientes de three.js y rhino3dm para mantener el modelo desacoplado
 * de la tecnologia de render/parseo.
 */

/** Una capa del modelo Rhino. */
export interface LayerInfo {
  id: string;
  name: string;
  /** Color de la capa en formato CSS (#rrggbb). */
  color: string;
  visible: boolean;
}

/** Vistas rapidas de camara disponibles. */
export type StandardView = "perspective" | "top" | "front" | "right";

/**
 * Modo de visualizacion de superficies.
 * - `shaded`: sombreado opaco neutro.
 * - `ghosted`: sombreado translucido (para ver a traves del modelo).
 * - `rendered`: iluminacion y sombras mas realistas.
 */
export type DisplayMode = "shaded" | "ghosted" | "rendered";

/** Tema visual de la interfaz (y del fondo de escena). */
export type Theme = "light" | "dark";

/** Medicion de distancia punto-a-punto sobre el modelo. */
export interface Measurement {
  id: string;
  distance: number;
  a: [number, number, number];
  b: [number, number, number];
}
