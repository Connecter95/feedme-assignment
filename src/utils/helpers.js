// ─── Constants ───────────────────────────────────────────────────────────────
export const ORDER_PROCESS_TIME = 10000; // 10 seconds
export const ARCHES_GOLD = "#FFC72C";
export const ARCHES_RED = "#DA291C";

// ─── Unique Order ID counter ─────────────────────────────────────────────────
let orderCounter = 0;
export const nextOrderId = () => ++orderCounter;

let botCounter = 0;
export const nextBotId = () => ++botCounter;

// ─── Helpers ─────────────────────────────────────────────────────────────────
export const timestamp = () => new Date().toLocaleTimeString("en-US", { hour12: false });
