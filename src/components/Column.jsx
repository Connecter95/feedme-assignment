export default function Column({ title, color, count, children }) {
  return (
    <div style={styles.column}>
      <div style={{ ...styles.columnHeader, borderColor: color }}>
        <span style={{ color }}>{title}</span>
        <span style={{ ...styles.badge, background: color }}>{count}</span>
      </div>
      <div style={styles.columnBody}>
        {children.length === 0
          ? <div style={styles.emptyState}>—</div>
          : children
        }
      </div>
    </div>
  );
}

const styles = {
  column: {
    background: "#1a1a1a",
    borderRadius: 8,
    border: "1px solid #2a2a2a",
    overflow: "hidden",
  },
  columnHeader: {
    padding: "12px 16px",
    borderBottom: "2px solid",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "0.1em",
  },
  badge: {
    borderRadius: 12, padding: "2px 9px", fontSize: 13, color: "#111", fontWeight: 700,
  },
  columnBody: { padding: 12, display: "flex", flexDirection: "column", gap: 8, minHeight: 120 },
  emptyState: { color: "#444", fontSize: 24, textAlign: "center", paddingTop: 24 },
};
