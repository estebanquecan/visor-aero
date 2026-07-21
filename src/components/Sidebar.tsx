import { Section } from "./Section";
import { ThemeToggle } from "./ThemeToggle";
import { LoadModelButton } from "./LoadModelButton";
import { LoadModelUrlInput } from "./LoadModelUrlInput";
import { ModelGallery } from "./ModelGallery";
import { LayerPanel } from "./LayerPanel";
import { ViewButtons } from "./ViewButtons";
import { DisplayModeButtons } from "./DisplayModeButtons";
import { DisplayOptions } from "./DisplayOptions";
import { MeasurePanel } from "./MeasurePanel";
import { useViewerStore } from "@/store/viewerStore";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  onOpenFile: (file: File) => void;
  onOpenUrl: (url: string) => void;
  onRemoveMeasurement: (id: string) => void;
  onClearMeasurements: () => void;
}

/** Panel lateral izquierdo: tema, carga de modelo, capas y controles de vista. */
export function Sidebar({
  onOpenFile,
  onOpenUrl,
  onRemoveMeasurement,
  onClearMeasurements,
}: SidebarProps) {
  const visible = useViewerStore((s) => s.sidebarVisible);
  const toggleSidebar = useViewerStore((s) => s.toggleSidebar);

  return (
    <aside className={`${styles.sidebar} ${visible ? "" : styles.collapsed}`}>
      <button type="button" className={styles.toggleBtn} onClick={toggleSidebar}>
        <span>{visible ? "◀ Ocultar Panel" : "▶ Mostrar Panel"}</span>
      </button>

      <div className={styles.scroll}>
        <Section title="Tema" defaultOpen={false}>
          <ThemeToggle />
        </Section>

        <Section title="Biblioteca de Modelos" defaultOpen={false}>
          <ModelGallery onOpenUrl={onOpenUrl} />
        </Section>

        <Section title="Cargar Modelo" defaultOpen={false}>
          <LoadModelButton onOpenFile={onOpenFile} />
          <LoadModelUrlInput onOpenUrl={onOpenUrl} />
        </Section>

        <Section title="Capas" defaultOpen={false}>
          <LayerPanel />
        </Section>

        <Section title="Controles" defaultOpen={false}>
          <ViewButtons />
        </Section>

        <Section title="Modo de Vista" defaultOpen={false}>
          <DisplayModeButtons />
        </Section>

        <Section title="Visualizacion" defaultOpen={false}>
          <DisplayOptions />
        </Section>

        <Section title="Medicion" defaultOpen={false}>
          <MeasurePanel
            onRemoveMeasurement={onRemoveMeasurement}
            onClearMeasurements={onClearMeasurements}
          />
        </Section>
      </div>
    </aside>
  );
}
