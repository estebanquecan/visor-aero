import styles from "./Watermark.module.css";

export function Watermark() {
  return (
    <div className={styles.watermark}>
      Luis Esteban Quecan Suarez<span className={styles.separator}>|</span>
      Copyright © 2026
    </div>
  );
}
