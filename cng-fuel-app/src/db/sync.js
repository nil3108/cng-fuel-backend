import { getOwner, getVehicles, getDrivers, getFills, getAuth } from "./database";
import { API_URL } from "../config";

const KEYS = { OWNER: "cng_owner", VEHICLES: "cng_vehicles", DRIVERS: "cng_drivers", FILLS: "cng_fills", AUTH: "cng_auth" };

function makeSignal(ms = 5000) {
  try { return AbortSignal.timeout(ms); } catch {
    const c = new AbortController();
    setTimeout(() => c.abort(), ms);
    return c.signal;
  }
}

async function apiRequest(path, opts = {}) {
  try {
    const headers = { "Content-Type": "application/json", ...opts.headers };
    const timeout = opts._timeout || (opts.method === "POST" ? 30000 : 5000);
    const url = API_URL + path;
    console.log(`[sync] ${opts.method || "GET"} ${url} (timeout: ${timeout}ms)`);
    const res = await fetch(url, { ...opts, headers, signal: makeSignal(timeout) });
    if (!res.ok) {
      console.error(`[sync] HTTP ${res.status} for ${path}`);
      return null;
    }
    const json = await res.json();
    console.log(`[sync] ${path} response:`, json);
    return json;
  } catch (e) {
    console.error(`[sync] API request failed:`, path, e.name, e.message);
    return null;
  }
}

export function isBackendReachable() {
  return apiRequest("/api/health").then((r) => r?.ok === true);
}

export function getApiUrl() { return API_URL; }

// Push ALL local data for a phone to the backend (with retry)
export async function pushSync(phone, retries = 2) {
  if (!phone) {
    const owner = getOwner();
    const auth = getAuth();
    phone = owner?.phone || auth?.user?.phone || auth?.phone || null;
  }
  if (!phone) return false;

  const auth = getAuth();
  const authOk = auth && (auth?.user?.phone === phone || auth?.phone === phone);

  const data = {
    owner: getOwner(),
    vehicles: getVehicles(),
    drivers: getDrivers(),
    fills: getFills(),
    auth: authOk ? auth : { user: { phone }, role: "owner" },
  };

  const payloadSize = JSON.stringify(data).length;
  const timeout = Math.max(30000, Math.min(120000, Math.round(payloadSize / 1000) * 1000));

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      console.log(`[sync] pushSync retry ${attempt}/${retries} for ${phone}`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
    const result = await apiRequest(`/api/sync/${phone}`, {
      method: "POST",
      body: JSON.stringify(data),
      _timeout: timeout,
    });
    if (result?.ok === true) return true;
  }
  return false;
}

// Pull ALL data from backend for a phone and write to localStorage
export async function pullSync(phone) {
  if (!phone) return false;
  const data = await apiRequest(`/api/sync/${phone}`);
  if (!data) return false;

  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  if (data.owner && data.owner.phone) write(KEYS.OWNER, data.owner);
  
  function mergeArray(key, backendArr) {
    if (!Array.isArray(backendArr)) return;
    const localArr = (() => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } })();
    const backendIds = new Set(backendArr.map((x) => x.id));
    const merged = [...backendArr];
    localArr.forEach((x) => { if (!backendIds.has(x.id)) merged.push(x); });
    write(key, merged);
  }
  mergeArray(KEYS.VEHICLES, data.vehicles);
  mergeArray(KEYS.DRIVERS, data.drivers);
  mergeArray(KEYS.FILLS, data.fills);
  if (data.auth) write(KEYS.AUTH, data.auth);

  // If pull returned data but local is empty, reload page to pick up
  return true;
}

// Fire-and-forget push (for non-critical writes)
export function pushSyncBg(phone) {
  pushSync(phone).then((ok) => {
    if (!ok) console.warn(`[sync] pushSyncBg(${phone}) returned false`);
  }).catch((e) => {
    console.error(`[sync] pushSyncBg(${phone}) threw:`, e);
  });
}
