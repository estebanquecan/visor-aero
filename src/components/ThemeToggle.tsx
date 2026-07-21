import { useViewerStore } from "@/store/viewerStore";
import styles from "./ThemeToggle.module.css";

/** Alterna entre tema claro y oscuro (afecta UI y fondo de la escena 3D). */
export function ThemeToggle() {
  const theme = useViewerStore((s) => s.theme);
  const toggleTheme = useViewerStore((s) => s.toggleTheme);
  const isDark = theme === "dark";

  return (
    <button type="button" className={styles.toggle} onClick={toggleTheme}>
      <span className={styles.icon}>{isDark ? "☀️" : "🌙"}</span>
      <span className={styles.label}>{isDark ? "Modo Claro" : "Modo Oscuro"}</span>
    </button>
  );
}
