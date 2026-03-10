import { useState, useEffect, useRef, useCallback } from "react";
import BotCard from "./components/BotCard";
import Column from "./components/Column";
import OrderCard from "./components/OrderCard";
import Stat from "./components/Stat";
import { ORDER_PROCESS_TIME, ARCHES_GOLD, ARCHES_RED, nextOrderId, nextBotId, timestamp } from "./utils/helpers";
import "./styles/app.css";
import "./styles/buttons.css";
import "./styles/cards.css";

export default function App() {
  const [orders, setOrders] = useState([]);
  const [bots, setBots] = useState([]);
  const [log, setLog] = useState([]);

  const ordersRef = useRef(orders);
  const botsRef = useRef(bots);
  const timerMap = useRef({});

  useEffect(() => { ordersRef.current = orders; }, [orders]);
  useEffect(() => { botsRef.current = bots; }, [bots]);

  const addLog = useCallback((msg) => {
    setLog(prev => [{ time: timestamp(), msg }, ...prev].slice(0, 50));
  }, []);

  const getPendingQueue = (orderList) =>
    orderList.filter(o => o.status === "PENDING").sort((a, b) => {
      if (a.type === b.type) return a.id - b.id;
      return a.type === "VIP" ? -1 : 1;
    });

  const assignBots = useCallback((currentBots, currentOrders) => {
    const pendingQueue = getPendingQueue(currentOrders);
    const idleBots = currentBots.filter(b => b.orderId === null);
    let updatedBots = [...currentBots];
    let updatedOrders = [...currentOrders];

    for (let i = 0; i < Math.min(idleBots.length, pendingQueue.length); i++) {
      const bot = idleBots[i];
      const order = pendingQueue[i];

      updatedOrders = updatedOrders.map(o =>
        o.id === order.id ? { ...o, status: "PROCESSING" } : o
      );
      updatedBots = updatedBots.map(b =>
        b.id === bot.id ? { ...b, orderId: order.id, startedAt: Date.now() } : b
      );

      addLog(`🤖 Bot #${bot.id} picked up Order #${order.id} (${order.type})`);

      const timeoutId = setTimeout(() => {
        setOrders(prev => prev.map(o =>
          o.id === order.id ? { ...o, status: "COMPLETE", completedAt: timestamp() } : o
        ));
        setBots(prev => {
          const freed = prev.map(b =>
            b.id === bot.id ? { ...b, orderId: null, startedAt: null } : b
          );
          addLog(`✅ Order #${order.id} completed by Bot #${bot.id}`);
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

  const addNormalOrder = () => {
    const newOrder = { id: nextOrderId(), type: "NORMAL", status: "PENDING", createdAt: timestamp() };
    addLog(`🧾 New Normal Order #${newOrder.id} placed`);
    setOrders(prev => {
      const updated = [...prev, newOrder];
      setBots(latestBots => { assignBots(latestBots, updated); return latestBots; });
      return updated;
    });
  };

  const addVipOrder = () => {
    const newOrder = { id: nextOrderId(), type: "VIP", status: "PENDING", createdAt: timestamp() };
    addLog(`⭐ New VIP Order #${newOrder.id} placed`);
    setOrders(prev => {
      const updated = [...prev, newOrder];
      setBots(latestBots => { assignBots(latestBots, updated); return latestBots; });
      return updated;
    });
  };

  const addBot = () => {
    const newBot = { id: nextBotId(), orderId: null, startedAt: null };
    addLog(`➕ Bot #${newBot.id} added`);
    setBots(prev => {
      const updated = [...prev, newBot];
      setOrders(latestOrders => { assignBots(updated, latestOrders); return latestOrders; });
      return updated;
    });
  };

  const removeBot = () => {
    setBots(prev => {
      if (prev.length === 0) return prev;
      const botToRemove = [...prev].sort((a, b) => b.id - a.id)[0];

      if (timerMap.current[botToRemove.id]) {
        clearTimeout(timerMap.current[botToRemove.id]);
        delete timerMap.current[botToRemove.id];
      }

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

  const pendingOrders = getPendingQueue(orders);
  const processingOrders = orders.filter(o => o.status === "PROCESSING");
  const completedOrders = orders.filter(o => o.status === "COMPLETE").reverse();

  return (
    <div style={styles.root}>
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
        <Column title="PENDING" color="#f59e0b" count={pendingOrders.length}>
          {pendingOrders.map(o => <OrderCard key={o.id} order={o} />)}
        </Column>

        <Column title="PROCESSING" color="#3b82f6" count={processingOrders.length}>
          {bots.map(bot => (
            <BotCard key={bot.id} bot={bot} order={orders.find(o => o.id === bot.orderId)} />
          ))}
        </Column>

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

const styles = {
  root: {
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
