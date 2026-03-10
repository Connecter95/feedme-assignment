import { useState, useEffect } from "react";
import { ORDER_PROCESS_TIME, ARCHES_GOLD } from "../utils/helpers";

export default function BotCard({ bot, order }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!bot.startedAt) { setProgress(0); return; }
    const tick = () => {
      const elapsed = Date.now() - bot.startedAt;
      setProgress(Math.min(100, (elapsed / ORDER_PROCESS_TIME) * 100));
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [bot.startedAt, bot.orderId]);

  const isIdle = !order;

  return (
    <div className={`bot-card ${isIdle ? "bot-idle" : "bot-active"}`}>
      <div style={styles.botTop}>
        <span style={styles.botIcon}>🤖</span>
        <span style={styles.botLabel}>Bot #{bot.id}</span>
        <span style={{ ...styles.botStatus, color: isIdle ? "#6b7280" : "#3b82f6" }}>
          {isIdle ? "IDLE" : "WORKING"}
        </span>
      </div>
      {!isIdle && order && (
        <>
          <div style={styles.botOrderLine}>
            Processing Order <strong>#{order.id.toString().padStart(3, "0")}</strong>
            {order.type === "VIP" && <span style={styles.vipBadge}>VIP</span>}
          </div>
          <div style={styles.progressTrack}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div style={styles.progressLabel}>{Math.round(progress)}%</div>
        </>
      )}
    </div>
  );
}

const styles = {
  botTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  botIcon: { fontSize: 18 },
  botLabel: { fontSize: 15, fontWeight: 700, flex: 1 },
  botStatus: { fontSize: 11, letterSpacing: "0.1em" },
  botOrderLine: { fontSize: 12, color: "#aaa", marginBottom: 6, display: "flex", gap: 6, alignItems: "center" },
  vipBadge: {
    background: ARCHES_GOLD, color: "#111", fontSize: 10, fontWeight: 700,
    borderRadius: 4, padding: "2px 6px", letterSpacing: "0.1em",
  },
  progressTrack: { height: 6, background: "#2a2a2a", borderRadius: 3, overflow: "hidden" },
  progressLabel: { fontSize: 10, color: "#555", marginTop: 3, textAlign: "right" },
};
