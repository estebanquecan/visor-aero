import { useState } from "react";
import type { ReactNode } from "react";
import styles from "./Section.module.css";

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Bloque colapsable reutilizable para agrupar controles del panel lateral. */
export function Section({ title, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={styles.section}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h2 className={styles.title}>{title}</h2>
        <span className={`${styles.chevron} ${open ? "" : styles.collapsed}`}>
          ▼
        </span>
      </button>
      {open && <div className={styles.content}>{children}</div>}
    </section>
  );
}
