import { useViewerStore } from "@/store/viewerStore";
import styles from "./SidebarToggleFloating.module.css";

/** Boton flotante para reabrir el panel cuando esta oculto (utilizado en movil). */
export function SidebarToggleFloating() {
  const visible = useViewerStore((s) => s.sidebarVisible);
  const toggleSidebar = useViewerStore((s) => s.toggleSidebar);

  if (visible) return null;

  return (
    <button
      type="button"
      className={styles.floating}
      onClick={toggleSidebar}
      aria-label="Mostrar panel"
    >
      ▶
    </button>
  );
}
