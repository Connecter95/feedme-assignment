import { ARCHES_GOLD } from "../utils/helpers";

export default function OrderCard({ order }) {
  const isVip = order.type === "VIP";
  const isComplete = order.status === "COMPLETE";

  return (
    <div className={`order-card ${isComplete ? "card-complete" : isVip ? "card-vip" : "card-normal"}`}>
      <div style={styles.cardTop}>
        <span style={styles.orderId}>#{order.id.toString().padStart(3, "0")}</span>
        {isVip && <span style={styles.vipBadge}>VIP</span>}
      </div>
      <div style={styles.cardMeta}>
        <span>{order.type}</span>
        {isComplete && <span style={styles.completeTime}>✓ {order.completedAt}</span>}
        {!isComplete && <span style={styles.createdTime}>{order.createdAt}</span>}
      </div>
    </div>
  );
}

const styles = {
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  orderId: { fontSize: 20, fontWeight: 700 },
  vipBadge: {
    background: ARCHES_GOLD, color: "#111", fontSize: 10, fontWeight: 700,
    borderRadius: 4, padding: "2px 6px", letterSpacing: "0.1em",
  },
  cardMeta: { display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "#888" },
  completeTime: { color: "#22c55e" },
  createdTime: { color: "#888" },
};
