import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const ORDER_PROCESS_TIME = 10000; // 10 seconds
const ARCHES_GOLD = "#FFC72C";
const ARCHES_RED = "#DA291C";

// ─── Unique Order ID counter ─────────────────────────────────────────────────
let orderCounter = 0;
const nextOrderId = () => ++orderCounter;

let botCounter = 0;
const nextBotId = () => ++botCounter;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const timestamp = () => new Date().toLocaleTimeString("en-US", { hour12: false });

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [orders, setOrders] = useState([]); // { id, type, status, createdAt }
  const [bots, setBots] = useState([]);     // { id, orderId | null, startedAt | null }
  const [log, setLog] = useState([]);

  // Refs to hold mutable state accessible inside timeouts
  const ordersRef = useRef(orders);
  const botsRef = useRef(bots);
  const timerMap = useRef({}); // botId -> timeoutId

  useEffect(() => { ordersRef.current = orders; }, [orders]);
  useEffect(() => { botsRef.current = bots; }, [bots]);

  const addLog = useCallback((msg) => {
    setLog(prev => [{ time: timestamp(), msg }, ...prev].slice(0, 50));
  }, []);

  // ── Queue helpers ──────────────────────────────────────────────────────────
  // Returns pending orders in priority queue order (VIP first, then Normal; FIFO within each)
  const getPendingQueue = (orderList) =>
    orderList.filter(o => o.status === "PENDING").sort((a, b) => {
      if (a.type === b.type) return a.id - b.id;
      return a.type === "VIP" ? -1 : 1;
    });

  // ── Bot tick: assign idle bots to pending orders ───────────────────────────
  const assignBots = useCallback((currentBots, currentOrders) => {
    const pendingQueue = getPendingQueue(currentOrders);
    const idleBots = currentBots.filter(b => b.orderId === null);
    let updatedBots = [...currentBots];
    let updatedOrders = [...currentOrders];

    for (let i = 0; i < Math.min(idleBots.length, pendingQueue.length); i++) {
      const bot = idleBots[i];
      const order = pendingQueue[i];

      // Mark order as PROCESSING
      updatedOrders = updatedOrders.map(o =>
        o.id === order.id ? { ...o, status: "PROCESSING" } : o
      );
      // Assign bot
      updatedBots = updatedBots.map(b =>
        b.id === bot.id ? { ...b, orderId: order.id, startedAt: Date.now() } : b
      );

      addLog(`🤖 Bot #${bot.id} picked up Order #${order.id} (${order.type})`);

      // Schedule completion
      const timeoutId = setTimeout(() => {
        // Complete the order
        setOrders(prev => prev.map(o =>
          o.id === order.id ? { ...o, status: "COMPLETE", completedAt: timestamp() } : o
        ));
        setBots(prev => {
          const freed = prev.map(b =>
            b.id === bot.id ? { ...b, orderId: null, startedAt: null } : b
          );
          addLog(`✅ Order #${order.id} completed by Bot #${bot.id}`);
          // Trigger next assignment
          setTimeout(() => {
            setBots(latestBots => {
              setOrders(latestOrders => {
                assignBots(latestBots, latestOrders);
                return latestOrders;
              });
              return latestBots;
            });
          }, 0);
          return freed;
        });
      }, ORDER_PROCESS_TIME);

      timerMap.current[bot.id] = timeoutId;
    }

    if (updatedBots !== currentBots) setBots(updatedBots);
    if (updatedOrders !== currentOrders) setOrders(updatedOrders);
  }, [addLog]);

  // ── Add Normal Order ───────────────────────────────────────────────────────
  const addNormalOrder = () => {
    const newOrder = { id: nextOrderId(), type: "NORMAL", status: "PENDING", createdAt: timestamp() };
    addLog(`🧾 New Normal Order #${newOrder.id} placed`);
    setOrders(prev => {
      const updated = [...prev, newOrder];
      setBots(latestBots => { assignBots(latestBots, updated); return latestBots; });
      return updated;
    });
  };

  // ── Add VIP Order ──────────────────────────────────────────────────────────
  const addVipOrder = () => {
    const newOrder = { id: nextOrderId(), type: "VIP", status: "PENDING", createdAt: timestamp() };
    addLog(`⭐ New VIP Order #${newOrder.id} placed`);
    setOrders(prev => {
      const updated = [...prev, newOrder];
      setBots(latestBots => { assignBots(latestBots, updated); return latestBots; });
      return updated;
    });
  };

  // ── Add Bot ────────────────────────────────────────────────────────────────
  const addBot = () => {
    const newBot = { id: nextBotId(), orderId: null, startedAt: null };
    addLog(`➕ Bot #${newBot.id} added`);
    setBots(prev => {
      const updated = [...prev, newBot];
      setOrders(latestOrders => { assignBots(updated, latestOrders); return latestOrders; });
      return updated;
    });
  };

  // ── Remove Bot ─────────────────────────────────────────────────────────────
  const removeBot = () => {
    setBots(prev => {
      if (prev.length === 0) return prev;
      // Remove the newest bot
      const botToRemove = [...prev].sort((a, b) => b.id - a.id)[0];

      // Cancel its timer
      if (timerMap.current[botToRemove.id]) {
        clearTimeout(timerMap.current[botToRemove.id]);
        delete timerMap.current[botToRemove.id];
      }

      // If it was processing an order, return that order to PENDING
      if (botToRemove.orderId !== null) {
        setOrders(latestOrders =>
          latestOrders.map(o =>
            o.id === botToRemove.orderId ? { ...o, status: "PENDING" } : o
          )
        );
        addLog(`↩️ Bot #${botToRemove.id} removed — Order #${botToRemove.orderId} returned to PENDING`);
      } else {
        addLog(`➖ Bot #${botToRemove.id} removed (was idle)`);
      }

      return prev.filter(b => b.id !== botToRemove.id);
    });
  };

  // ── Derived views ──────────────────────────────────────────────────────────
  const pendingOrders = getPendingQueue(orders);
  const processingOrders = orders.filter(o => o.status === "PROCESSING");
  const completedOrders = orders.filter(o => o.status === "COMPLETE").reverse();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      <style>{css}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.archesM}>M</span>
          <div>
            <div style={styles.headerTitle}>McDONALD'S</div>
            <div style={styles.headerSub}>KITCHEN ORDER CONTROLLER</div>
          </div>
        </div>
        <div style={styles.statsRow}>
          <Stat label="PENDING" value={pendingOrders.length} color="#f59e0b" />
          <Stat label="PROCESSING" value={processingOrders.length} color="#3b82f6" />
          <Stat label="COMPLETE" value={completedOrders.length} color="#22c55e" />
          <Stat label="BOTS" value={bots.length} color={ARCHES_GOLD} />
        </div>
      </header>

      {/* Control Bar */}
      <div style={styles.controlBar}>
        <div style={styles.controlGroup}>
          <span style={styles.controlLabel}>ORDERS</span>
          <button className="btn btn-normal" onClick={addNormalOrder}>+ Normal Order</button>
          <button className="btn btn-vip" onClick={addVipOrder}>⭐ VIP Order</button>
        </div>
        <div style={styles.controlGroup}>
          <span style={styles.controlLabel}>BOTS</span>
          <button className="btn btn-add" onClick={addBot}>+ Bot</button>
          <button className="btn btn-remove" onClick={removeBot} disabled={bots.length === 0}>− Bot</button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={styles.grid}>
        {/* Pending Column */}
        <Column title="PENDING" color="#f59e0b" count={pendingOrders.length}>
          {pendingOrders.map(o => <OrderCard key={o.id} order={o} />)}
        </Column>

        {/* Processing Column */}
        <Column title="PROCESSING" color="#3b82f6" count={processingOrders.length}>
          {bots.map(bot => (
            <BotCard key={bot.id} bot={bot} order={orders.find(o => o.id === bot.orderId)} />
          ))}
        </Column>

        {/* Complete Column */}
        <Column title="COMPLETE" color="#22c55e" count={completedOrders.length}>
          {completedOrders.map(o => <OrderCard key={o.id} order={o} />)}
        </Column>
      </div>

      {/* Activity Log */}
      <div style={styles.logBox}>
        <div style={styles.logTitle}>📋 ACTIVITY LOG</div>
        <div style={styles.logList}>
          {log.length === 0
            ? <div style={styles.logEmpty}>No activity yet. Add orders or bots to get started.</div>
            : log.map((entry, i) => (
              <div key={i} style={styles.logEntry}>
                <span style={styles.logTime}>{entry.time}</span>
                <span>{entry.msg}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stat({ label, value, color }) {
  return (
    <div style={styles.stat}>
      <div style={{ ...styles.statValue, color }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function Column({ title, color, count, children }) {
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

function OrderCard({ order }) {
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

function BotCard({ bot, order }) {
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  root: {
    fontFamily: "'Bebas Neue', 'Impact', sans-serif",
    background: "#111",
    minHeight: "100vh",
    color: "#f5f5f5",
    padding: "0 0 40px",
    letterSpacing: "0.03em",
  },
  header: {
    background: ARCHES_RED,
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    boxShadow: `0 4px 0 ${ARCHES_GOLD}`,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  archesM: {
    fontSize: 56, fontWeight: 900, color: ARCHES_GOLD,
    lineHeight: 1, textShadow: "2px 2px 0 rgba(0,0,0,0.3)",
    fontFamily: "'Bebas Neue', Impact, sans-serif",
  },
  headerTitle: { fontSize: 28, fontWeight: 700, color: "#fff", lineHeight: 1.1 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", letterSpacing: "0.15em" },
  statsRow: { display: "flex", gap: 24 },
  stat: { textAlign: "center" },
  statValue: { fontSize: 28, fontWeight: 700, lineHeight: 1 },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", marginTop: 2 },
  controlBar: {
    background: "#1a1a1a",
    borderBottom: "1px solid #2a2a2a",
    padding: "12px 24px",
    display: "flex",
    gap: 32,
    flexWrap: "wrap",
    alignItems: "center",
  },
  controlGroup: { display: "flex", alignItems: "center", gap: 10 },
  controlLabel: { fontSize: 11, color: "#555", letterSpacing: "0.15em", marginRight: 4 },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 16,
    padding: "20px 24px",
    minHeight: 400,
  },
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
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  orderId: { fontSize: 20, fontWeight: 700 },
  vipBadge: {
    background: ARCHES_GOLD, color: "#111", fontSize: 10, fontWeight: 700,
    borderRadius: 4, padding: "2px 6px", letterSpacing: "0.1em",
  },
  cardMeta: { display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "#888" },
  completeTime: { color: "#22c55e" },
  createdTime: { color: "#888" },
  botTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  botIcon: { fontSize: 18 },
  botLabel: { fontSize: 15, fontWeight: 700, flex: 1 },
  botStatus: { fontSize: 11, letterSpacing: "0.1em" },
  botOrderLine: { fontSize: 12, color: "#aaa", marginBottom: 6, display: "flex", gap: 6, alignItems: "center" },
  progressTrack: { height: 6, background: "#2a2a2a", borderRadius: 3, overflow: "hidden" },
  progressLabel: { fontSize: 10, color: "#555", marginTop: 3, textAlign: "right" },
  logBox: {
    margin: "0 24px",
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: 8,
    overflow: "hidden",
  },
  logTitle: { padding: "10px 16px", borderBottom: "1px solid #2a2a2a", fontSize: 13, color: "#888", letterSpacing: "0.1em" },
  logList: { padding: "8px 16px", maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 },
  logEmpty: { color: "#444", fontSize: 13, padding: "8px 0" },
  logEntry: { display: "flex", gap: 12, fontSize: 13, color: "#ccc" },
  logTime: { color: "#555", flexShrink: 0, fontFamily: "monospace", fontSize: 12 },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .btn {
    font-family: 'Bebas Neue', Impact, sans-serif;
    font-size: 14px;
    letter-spacing: 0.08em;
    border: none;
    border-radius: 5px;
    padding: 8px 16px;
    cursor: pointer;
    transition: transform 0.08s, opacity 0.15s;
  }
  .btn:active { transform: scale(0.96); }
  .btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .btn-normal { background: #374151; color: #f5f5f5; }
  .btn-normal:hover:not(:disabled) { background: #4b5563; }

  .btn-vip { background: ${ARCHES_GOLD}; color: #111; }
  .btn-vip:hover:not(:disabled) { background: #ffd444; }

  .btn-add { background: #166534; color: #d1fae5; }
  .btn-add:hover:not(:disabled) { background: #15803d; }

  .btn-remove { background: #7f1d1d; color: #fee2e2; }
  .btn-remove:hover:not(:disabled) { background: #991b1b; }

  .order-card {
    border-radius: 6px;
    padding: 10px 12px;
    border-left: 4px solid;
    animation: slideIn 0.2s ease;
  }
  .card-normal { background: #1f2937; border-color: #374151; }
  .card-vip { background: #2d2208; border-color: ${ARCHES_GOLD}; }
  .card-complete { background: #052e16; border-color: #22c55e; }

  .bot-card {
    border-radius: 6px;
    padding: 10px 12px;
    border: 1px solid #2a2a2a;
  }
  .bot-idle { background: #1a1a1a; opacity: 0.6; }
  .bot-active { background: #0c1a2e; border-color: #1e40af; }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #1d4ed8, #3b82f6);
    border-radius: 3px;
    transition: width 0.1s linear;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

// ─── React Render ────────────────────────────────────────────────────────────
import React from 'react';
import ReactDOM from 'react-dom/client';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
