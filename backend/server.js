import "dotenv/config";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, readFileSync } from "fs";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { Resend } from "resend";
import db from "./db.js";

// Auto-seed from data-seed.json on fresh deploy
try {
  const count = db.prepare("SELECT COUNT(*) as c FROM user_sync").get().c;
  if (count === 0 && existsSync("data-seed.json")) {
    const seed = JSON.parse(readFileSync("data-seed.json", "utf-8"));
    const ins = db.prepare("INSERT OR REPLACE INTO user_sync (phone, data, updatedAt) VALUES (?,?,?)");
    for (const [phone, data] of Object.entries(seed)) {
      ins.run(phone, JSON.stringify(data), new Date().toISOString());
    }
    console.log(`[seed] Restored ${Object.keys(seed).length} records from data-seed.json`);
    for (const [phone, data] of Object.entries(seed)) {
      try {
        const { owner, vehicles, drivers, fills, auth } = data;
        const updatedAt = new Date().toISOString();
        const upsertOwner = db.prepare("INSERT OR REPLACE INTO owners (phone, name, email, address, createdAt) VALUES (?,?,?,?,?)");
        const delVehicles = db.prepare("DELETE FROM vehicles WHERE ownerPhone = ?");
        const insVehicle = db.prepare("INSERT OR REPLACE INTO vehicles (id, ownerPhone, regNo, brand, model, year, createdAt) VALUES (?,?,?,?,?,?,?)");
        const delDrivers = db.prepare("DELETE FROM drivers WHERE ownerPhone = ?");
        const insDriver = db.prepare("INSERT OR REPLACE INTO drivers (id, ownerPhone, name, phone, driverCode, vehicleId, createdAt) VALUES (?,?,?,?,?,?,?)");
        const delFills = db.prepare("DELETE FROM fills WHERE ownerPhone = ?");
        const insFill = db.prepare(`INSERT OR REPLACE INTO fills (id, ownerPhone, vehicleId, regNo, driver, kg, rate, rs, date, time, station, odometer, photos, stationCoords, odometerCoords, locationStatus, stationPhotoTimestamp, odometerPhotoTimestamp, timeGapMin, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
        const upsertAuth = db.prepare("INSERT OR REPLACE INTO auth (phone, role, name, otp, createdAt) VALUES (?,?,?,?,?)");
        const tx = db.transaction(() => {
          if (owner?.phone) upsertOwner.run(owner.phone, owner.name || "", owner.email || "", owner.address || "", owner.createdAt || updatedAt);
          if (Array.isArray(vehicles)) {
            delVehicles.run(phone);
            for (const v of vehicles) insVehicle.run(v.id, phone, v.regNo || "", v.brand || "", v.model || "", v.year || "", v.createdAt || updatedAt);
          }
          if (Array.isArray(drivers)) {
            delDrivers.run(phone);
            for (const d of drivers) insDriver.run(d.id, phone, d.name || "", d.phone || "", d.driverCode || "", d.vehicleId || "", d.createdAt || updatedAt);
          }
          if (Array.isArray(fills)) {
            delFills.run(phone);
            for (const f of fills) insFill.run(
              f.id, phone, f.vehicleId || "", f.regNo || "", f.driver || "",
              f.kg || 0, f.rate || 0, f.rs || 0, f.date || "", f.time || "", f.station || "", f.odometer || "",
              JSON.stringify(f.photos || {}), JSON.stringify(f.stationCoords || null), JSON.stringify(f.odometerCoords || null),
              f.locationStatus || "", f.stationPhotoTimestamp || "", f.odometerPhotoTimestamp || "", f.timeGapMin || null,
              f.createdAt || updatedAt
            );
          }
          if (auth?.phone) upsertAuth.run(auth.phone, auth.role || "", auth.name || "", auth.otp || "", auth.createdAt || updatedAt);
        });
        tx();
      } catch (e) {
        console.error(`[seed] Failed to restore tables for ${phone}:`, e.message);
      }
    }
    console.log(`[seed] All tables restored for ${Object.keys(seed).length} records`);
  }
} catch (e) {
  console.error("[seed] Auto-seed failed:", e.message);
}

const resend = new Resend(process.env.RESEND_API_KEY || "");
const otpStore = new Map();
const OTP_EXPIRY_MS = 10 * 60 * 1000;

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const __dirname = dirname(fileURLToPath(import.meta.url));
const staticDir = join(__dirname, "dist");
app.use(express.static(staticDir));

function safeJson(val, fallback = null) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function mergeById(existing, incoming) {
  if (!Array.isArray(existing) && !Array.isArray(incoming)) return [];
  if (!Array.isArray(existing)) return incoming || [];
  if (!Array.isArray(incoming)) return existing;
  const seen = new Set(existing.map((x) => x.id));
  const merged = [...existing];
  for (const item of incoming) {
    if (!seen.has(item.id)) {
      merged.push(item);
      seen.add(item.id);
    }
  }
  return merged;
}

function deserializeFill(row) {
  return {
    ...row,
    photos: safeJson(row.photos, {}),
    stationCoords: safeJson(row.stationCoords),
    odometerCoords: safeJson(row.odometerCoords),
  };
}

// ─── WebSocket server for real-time sync ───
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const ownerSubscribers = new Map();

function broadcastToOwner(ownerPhone, event, payload) {
  const clients = ownerSubscribers.get(ownerPhone);
  if (!clients) return;
  const message = JSON.stringify({ event, payload });
  for (const client of clients) {
    if (client.readyState === 1) {
      try { client.send(message); } catch {}
    }
  }
}

wss.on("connection", (ws, req) => {
  let registered = false;
  ws.isAlive = true;
  ws.ownerPhone = null;

  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "register" && msg.ownerPhone) {
        ws.ownerPhone = msg.ownerPhone;
        if (!ownerSubscribers.has(msg.ownerPhone)) {
          ownerSubscribers.set(msg.ownerPhone, new Set());
        }
        ownerSubscribers.get(msg.ownerPhone).add(ws);
        registered = true;
        ws.send(JSON.stringify({ event: "registered", payload: { ownerPhone: msg.ownerPhone } }));
        console.log(`[ws] Client registered for owner: ${msg.ownerPhone}`);
      }
    } catch (e) {
      console.error("[ws] bad message:", e.message);
    }
  });

  ws.on("close", () => {
    if (ws.ownerPhone && ownerSubscribers.has(ws.ownerPhone)) {
      ownerSubscribers.get(ws.ownerPhone).delete(ws);
      if (ownerSubscribers.get(ws.ownerPhone).size === 0) {
        ownerSubscribers.delete(ws.ownerPhone);
      }
    }
  });

  ws.on("error", (e) => {
    console.error("[ws] error:", e.message);
  });
});

const wsHeartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) { ws.terminate(); return; }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("close", () => { clearInterval(wsHeartbeat); });

// ─── Email OTP endpoints ───
app.post("/api/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expiresAt: Date.now() + OTP_EXPIRY_MS });
    console.log(`[otp] OTP for ${email}: ${otp}`);

    const otpResponse = { ok: true, otp: otp };

    if (process.env.RESEND_API_KEY) {
      try {
        const { data: emailData, error } = await resend.emails.send({
          from: "CNG Fuel <onboarding@resend.dev>",
          to: email,
          subject: "Your OTP for CNG Fuel",
          html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px"><h2 style="color:#DC2626">CNG Fuel</h2><p>Your login code:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:16px;background:#f5f5f5;border-radius:12px;color:#0B0B0B">${otp}</div><p style="color:#666;font-size:12px">Expires in 10 minutes</p></div>`,
        });
        if (error) console.error("[otp] Resend error:", error);
      } catch (e) {
        console.error("[otp] Resend send failed:", e.message);
      }
    }

    res.json(otpResponse);
  } catch (e) {
    console.error("[otp] send error:", e);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

app.post("/api/verify-otp", (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP required" });

    const stored = otpStore.get(email);
    if (!stored) return res.status(400).json({ error: "No OTP sent to this email" });
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ error: "OTP expired" });
    }
    if (stored.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });

    otpStore.delete(email);

    let owner = null;
    let syncData = null;
    try {
      const emailLower = email.toLowerCase();
      const allOwners = db.prepare("SELECT o.*, LENGTH(COALESCE(s.data,'')) as dataSize FROM owners o LEFT JOIN user_sync s ON s.phone = o.phone ORDER BY dataSize DESC").all();
      const ownerRow = allOwners.find((o) => (o.email || "").toLowerCase() === emailLower);
      if (ownerRow) {
        owner = ownerRow;
        const syncRow = db.prepare("SELECT data FROM user_sync WHERE phone = ?").get(ownerRow.phone);
        if (syncRow) syncData = safeJson(syncRow.data, null);
      } else {
        const allSync = db.prepare("SELECT phone, data FROM user_sync ORDER BY LENGTH(data) DESC").all();
        for (const row of allSync) {
          const parsed = safeJson(row.data, null);
          if (parsed?.owner && (parsed.owner.email || "").toLowerCase() === emailLower) {
            owner = { phone: row.phone, ...parsed.owner };
            syncData = parsed;
            break;
          }
        }
      }
    } catch {}

    res.json({ ok: true, owner, syncData });
  } catch (e) {
    res.status(500).json({ error: "Verification failed" });
  }
});

// ─── Health ───
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ─── Debug ───
app.get("/api/debug", (req, res) => {
  const syncCount = db.prepare("SELECT COUNT(*) as c FROM user_sync").get().c;
  const ownerCount = db.prepare("SELECT COUNT(*) as c FROM owners").get().c;
  const vehicleCount = db.prepare("SELECT COUNT(*) as c FROM vehicles").get().c;
  const driverCount = db.prepare("SELECT COUNT(*) as c FROM drivers").get().c;
  const fillCount = db.prepare("SELECT COUNT(*) as c FROM fills").get().c;
  res.json({ syncCount, ownerCount, vehicleCount, driverCount, fillCount, wsClients: wss.clients.size });
});

// ─── Sync blob endpoints ───
app.get("/api/sync/all", (req, res) => {
  try {
    const rows = db.prepare("SELECT phone, data, updatedAt FROM user_sync ORDER BY updatedAt DESC").all();
    res.json(rows.map((r) => ({ phone: r.phone, data: safeJson(r.data, {}), updatedAt: r.updatedAt })));
  } catch (e) {
    res.status(500).json({ error: "Failed to load sync data" });
  }
});

app.get("/api/sync/:phone", (req, res) => {
  try {
    const row = db.prepare("SELECT data FROM user_sync WHERE phone = ?").get(req.params.phone);
    if (!row) return res.status(404).json({ error: "No data for this phone" });
    const data = safeJson(row.data);
    if (!data) return res.status(500).json({ error: "Corrupt sync data" });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Failed to load sync data" });
  }
});

app.post("/api/sync/:phone", (req, res) => {
  try {
    const { phone } = req.params;
    const incoming = req.body;
    if (!incoming || typeof incoming !== "object") {
      console.error(`[sync] Invalid body from ${phone}`);
      return res.status(400).json({ error: "Invalid request body" });
    }

    const existingRow = db.prepare("SELECT data FROM user_sync WHERE phone = ?").get(phone);
    const existing = existingRow ? safeJson(existingRow.data, {}) : {};

    const data = {
      owner: incoming.owner?.phone ? incoming.owner : (existing.owner || null),
      vehicles: Array.isArray(incoming.vehicles) && incoming.vehicles.length > 0 ? incoming.vehicles : (existing.vehicles || []),
      drivers: Array.isArray(incoming.drivers) && incoming.drivers.length > 0 ? incoming.drivers : (existing.drivers || []),
      fills: mergeById(existing.fills, incoming.fills),
      auth: incoming.auth || existing.auth || null,
    };

    const fillCount = Array.isArray(data.fills) ? data.fills.length : 0;
    const totalBytes = JSON.stringify(data).length;
    console.log(`[sync] POST from ${phone}: ${fillCount} fills, ${(totalBytes/1024).toFixed(1)}KB`);
    const updatedAt = new Date().toISOString();
    db.prepare("INSERT OR REPLACE INTO user_sync (phone, data, updatedAt) VALUES (?,?,?)").run(phone, JSON.stringify(data), updatedAt);

    const { owner, vehicles, drivers, fills, auth } = data;

    const upsertOwner = db.prepare("INSERT OR REPLACE INTO owners (phone, name, email, address, createdAt) VALUES (?,?,?,?,?)");
    const delVehicles = db.prepare("DELETE FROM vehicles WHERE ownerPhone = ?");
    const insVehicle = db.prepare("INSERT OR REPLACE INTO vehicles (id, ownerPhone, regNo, brand, model, year, createdAt) VALUES (?,?,?,?,?,?,?)");
    const delDrivers = db.prepare("DELETE FROM drivers WHERE ownerPhone = ?");
    const insDriver = db.prepare("INSERT OR REPLACE INTO drivers (id, ownerPhone, name, phone, driverCode, vehicleId, createdAt) VALUES (?,?,?,?,?,?,?)");
    const delFills = db.prepare("DELETE FROM fills WHERE ownerPhone = ?");
    const insFill = db.prepare(`INSERT OR REPLACE INTO fills
      (id, ownerPhone, vehicleId, regNo, driver, kg, rate, rs, date, time, station, odometer,
       photos, stationCoords, odometerCoords, locationStatus, stationPhotoTimestamp, odometerPhotoTimestamp, timeGapMin, createdAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const upsertAuth = db.prepare("INSERT OR REPLACE INTO auth (phone, role, name, otp, createdAt) VALUES (?,?,?,?,?)");

    const tx = db.transaction(() => {
      if (owner?.phone) upsertOwner.run(owner.phone, owner.name || "", owner.email || "", owner.address || "", owner.createdAt || updatedAt);
      if (Array.isArray(vehicles)) {
        delVehicles.run(phone);
        for (const v of vehicles) insVehicle.run(v.id, phone, v.regNo || "", v.brand || "", v.model || "", v.year || "", v.createdAt || updatedAt);
      }
      if (Array.isArray(drivers)) {
        delDrivers.run(phone);
        for (const d of drivers) insDriver.run(d.id, phone, d.name || "", d.phone || "", d.driverCode || "", d.vehicleId || "", d.createdAt || updatedAt);
      }
      if (Array.isArray(fills)) {
        delFills.run(phone);
        for (const f of fills) insFill.run(
          f.id, phone, f.vehicleId || "", f.regNo || "", f.driver || "",
          f.kg || 0, f.rate || 0, f.rs || 0, f.date || "", f.time || "", f.station || "", f.odometer || "",
          JSON.stringify(f.photos || {}), JSON.stringify(f.stationCoords || null), JSON.stringify(f.odometerCoords || null),
          f.locationStatus || "", f.stationPhotoTimestamp || "", f.odometerPhotoTimestamp || "", f.timeGapMin || null,
          f.createdAt || updatedAt
        );
      }
      if (auth?.phone) upsertAuth.run(auth.phone, auth.role || "", auth.name || "", auth.otp || "", auth.createdAt || updatedAt);
    });
    tx();

    res.json({ ok: true, updatedAt });

    setTimeout(() => {
      broadcastToOwner(phone, "sync:updated", data);
    }, 100);
  } catch (e) {
    console.error("[sync] POST error:", e);
    res.status(500).json({ error: "Sync failed" });
  }
});

// ─── Admin query endpoints ───
app.get("/api/owners", (req, res) => res.json(db.prepare("SELECT * FROM owners").all()));
app.get("/api/owner/:phone", (req, res) => {
  const row = db.prepare("SELECT * FROM owners WHERE phone = ?").get(req.params.phone);
  row ? res.json(row) : res.status(404).json({ error: "Not found" });
});

app.get("/api/vehicles/all", (req, res) => res.json(db.prepare("SELECT * FROM vehicles").all()));
app.get("/api/vehicles/:ownerPhone", (req, res) => res.json(db.prepare("SELECT * FROM vehicles WHERE ownerPhone = ?").all(req.params.ownerPhone)));

app.get("/api/drivers/all", (req, res) => res.json(db.prepare("SELECT * FROM drivers").all()));
app.get("/api/drivers/:ownerPhone", (req, res) => res.json(db.prepare("SELECT * FROM drivers WHERE ownerPhone = ?").all(req.params.ownerPhone)));

app.get("/api/fills/all", (req, res) => {
  res.json(db.prepare("SELECT * FROM fills ORDER BY date DESC, time DESC").all().map(deserializeFill));
});
app.get("/api/fills/:ownerPhone", (req, res) => {
  res.json(db.prepare("SELECT * FROM fills WHERE ownerPhone = ? ORDER BY date DESC, time DESC").all(req.params.ownerPhone).map(deserializeFill));
});

// ─── SPA fallback ───
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  res.sendFile(join(staticDir, "index.html"));
});

httpServer.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
