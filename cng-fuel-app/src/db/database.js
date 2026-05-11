import { pushSyncBg } from "./sync";

const KEYS = {
  OWNER: "cng_owner",
  VEHICLES: "cng_vehicles",
  DRIVERS: "cng_drivers",
  FILLS: "cng_fills",
  AUTH: "cng_auth",
};

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function write(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function getPhone() {
  const owner = read(KEYS.OWNER);
  if (owner?.phone) return owner.phone;
  const auth = read(KEYS.AUTH);
  if (auth?.user?.phone || auth?.phone) return auth?.user?.phone || auth?.phone;
  // Fallback: try to find ownerPhone from any stored driver
  const drivers = read(KEYS.DRIVERS);
  if (Array.isArray(drivers)) {
    for (const d of drivers) {
      if (d.ownerPhone) return d.ownerPhone;
    }
  }
  return null;
}

/* Auth */
export function getAuth() { return read(KEYS.AUTH); }
export function setAuth(data) { write(KEYS.AUTH, data); }
export function clearAuth() { localStorage.removeItem(KEYS.AUTH); }

/* Owner */
export function getOwner() { return read(KEYS.OWNER); }
export function setOwner(data) {
  const existing = getOwner() || {};
  write(KEYS.OWNER, { ...existing, ...data });
  pushSyncBg(getPhone());
}

/* Vehicles */
export function getVehicles() { return read(KEYS.VEHICLES) || []; }
export function addVehicle(v) {
  const list = getVehicles();
  const id = "v" + Date.now();
  list.push({ id, ...v });
  write(KEYS.VEHICLES, list);
  pushSyncBg(getPhone());
  return id;
}
export function getVehicle(id) {
  return getVehicles().find((v) => v.id === id) || null;
}
export function updateVehicle(id, data) {
  const list = getVehicles();
  const idx = list.findIndex((v) => v.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...data };
  write(KEYS.VEHICLES, list);
  pushSyncBg(getPhone());
}

/* Drivers */
export function getDrivers() { return read(KEYS.DRIVERS) || []; }
export function addDriver(d) {
  const list = getDrivers();
  const id = "d" + Date.now();
  const driverCode = Math.floor(100000 + Math.random() * 900000).toString();
  const owner = getOwner();
  list.push({ id, driverCode, ownerPhone: owner?.phone || "", ...d });
  write(KEYS.DRIVERS, list);
  pushSyncBg(getPhone());
  return { id, driverCode };
}
export function deleteDriver(id) {
  const list = getDrivers().filter((d) => d.id !== id);
  write(KEYS.DRIVERS, list);
  pushSyncBg(getPhone());
}
export function getDriverByCode(code) {
  return getDrivers().find((d) => d.driverCode === code) || null;
}
export function getDriverByPhone(phone) {
  return getDrivers().find((d) => d.mobile === phone) || null;
}

/* Fills */
export function getFills() { return read(KEYS.FILLS) || []; }
export function addFill(f) {
  const list = getFills();
  const id = "f" + Date.now();
  const localOwner = getOwner();
  const ownerPhone = f.ownerPhone || localOwner?.phone || null;
  const { id: _ignore, ownerPhone: _op, ...rest } = f;
  list.unshift({ id, ownerPhone, createdAt: new Date().toISOString(), ...rest });
  write(KEYS.FILLS, list);
  pushSyncBg(ownerPhone || getPhone());
  return id;
}
export function getFillsByVehicle(vehicleId) {
  return getFills().filter((f) => f.vehicleId === vehicleId);
}

/* Anomalies (computed from fills) */
export function getAnomalies() {
  const fills = getFills();
  const anomalies = [];

  fills.forEach((f) => {
    if (f.locationStatus === "mismatch") {
      anomalies.push({
        id: "la" + f.id,
        type: "location",
        vehicleNo: f.regNo || "Unknown",
        date: f.date,
        vehicleId: f.vehicleId,
        distanceKm: f.mismatchDistance || 0,
      });
    }
  });

  const vehicleFills = {};
  fills.forEach((f) => {
    if (!vehicleFills[f.vehicleId]) vehicleFills[f.vehicleId] = [];
    vehicleFills[f.vehicleId].push(f);
  });

  Object.entries(vehicleFills).forEach(([vid, vfills]) => {
    const recent = vfills.filter((f) => {
      const d = new Date(f.date);
      return !isNaN(d) && (Date.now() - d) < 14 * 86400000;
    });
    if (recent.length < 3) return;
    const avg = recent.reduce((s, f) => s + f.kg, 0) / recent.length;
    recent.forEach((f) => {
      if (f.kg < avg * 0.8) {
        anomalies.push({
          id: "ea" + f.id,
          type: "efficiency",
          vehicleNo: f.regNo || "Unknown",
          date: f.date,
          vehicleId: f.vehicleId,
          expectedKG: Math.round(avg * 10) / 10,
          actualKG: f.kg,
          deviation: Math.round((1 - f.kg / avg) * 1000) / 10,
        });
      }
    });
  });

  return anomalies;
}
