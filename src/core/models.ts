/** Metadatos de un modelo publicado en la biblioteca. */
export interface Model3D {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail: string;
  /** Archivo que el visor carga al seleccionar el modelo (hoy, un .3dm). */
  viewer: string;
  /** Archivo .3dm que se ofrece para descarga directa. */
  download: string;
  tags: string[];
}

const MODELS_URL = "/data/models.json";

/**
 * Carga el catalogo de modelos de la biblioteca.
 *
 * Hoy la fuente es un JSON estatico servido desde public/data/models.json.
 * Para migrar a un almacenamiento externo (S3, WorkDrive, R2, etc.) basta con
 * reemplazar la implementacion de esta funcion -por ejemplo, apuntando a un
 * endpoint de API que devuelva el mismo arreglo de Model3D- sin tocar los
 * componentes que la consumen.
 */
export async function loadModels(): Promise<Model3D[]> {
  const response = await fetch(MODELS_URL);
  if (!response.ok) {
    throw new Error(`No se pudo cargar el catalogo de modelos (estado ${response.status})`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("El catalogo de modelos tiene un formato invalido");
  }

  return data as Model3D[];
}
