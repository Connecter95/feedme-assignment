export default function Stat({ label, value, color }) {
  return (
    <div style={styles.stat}>
      <div style={{ ...styles.statValue, color }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles = {
  stat: { textAlign: "center" },
  statValue: { fontSize: 28, fontWeight: 700, lineHeight: 1 },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", marginTop: 2 },
};
