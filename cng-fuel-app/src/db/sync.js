import { getOwner, getVehicles, getDrivers, getFills, getAuth } from "./database";

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
    const timeout = opts._timeout || (opts.method === "POST" ? 30000 : 15000);
    const url = (window.API_URL || "") + path;
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

// Pull ALL data from backend for a phone and write to localStorage
export async function pullSync(phone) {
  if (!phone) return false;
  const data = await apiRequest(`/api/sync/${phone}`);
  if (!data) return false;

  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  if (data.owner && data.owner.phone) {
    const owner = { ...data.owner };
    if (!owner.firstName && owner.fullName) {
      owner.firstName = owner.fullName.split(" ")[0];
    }
    write(KEYS.OWNER, owner);
  }
  
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

const RAILWAY_URL = "https://web-production-e466.up.railway.app";

async function pushSyncToUrl(url, phone) {
  if (!phone) return false;
  const auth = getAuth();
  const authOk = auth && (auth?.user?.phone === phone || auth?.phone === phone);

  // Try to merge with existing backend data so driver fills don't overwrite owner data
  let remote = null;
  try { const r = await fetch(url, { signal: makeSignal(8000) }); if (r.ok) remote = await r.json(); } catch {}

  // Merge fills by ID: keep server fills + add local fills not already on server
  function mergeFills(existing, incoming) {
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

  const data = {
    owner: remote?.owner || getOwner(),
    vehicles: remote?.vehicles && remote.vehicles.length > 0 ? remote.vehicles : getVehicles(),
    drivers: remote?.drivers && remote.drivers.length > 0 ? remote.drivers : getDrivers(),
    fills: mergeFills(remote?.fills, getFills()),
    auth: authOk ? auth : (remote?.auth || { user: { phone }, role: "owner" }),
  };
  const payloadSize = JSON.stringify(data).length;
  const timeout = Math.max(30000, Math.min(120000, Math.round(payloadSize / 1000) * 1000));
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * attempt));
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: makeSignal(timeout),
      });
      const j = await res.json();
      if (j?.ok === true) return true;
    } catch {}
  }
  return false;
}

export async function pushSync(phone, retries = 2) {
  if (!phone) {
    const owner = getOwner();
    const auth = getAuth();
    phone = owner?.phone || auth?.user?.phone || auth?.phone || null;
  }
  if (!phone) return false;

  const primaryUrl = (window.API_URL || "") + `/api/sync/${phone}`;
  const railwayUrl = RAILWAY_URL + `/api/sync/${phone}`;

  // Push to primary (local dev) and railway in parallel
  const results = await Promise.allSettled([
    pushSyncToUrl(primaryUrl, phone),
    ...(primaryUrl !== railwayUrl ? [pushSyncToUrl(railwayUrl, phone)] : []),
  ]);

  // Log results
  results.forEach((r, i) => {
    if (r.status === "rejected") console.warn(`[sync] push attempt ${i} failed:`, r.reason);
    else if (!r.value) console.warn(`[sync] push attempt ${i} returned false`);
  });

  // Return true if at least one succeeded
  return results.some((r) => r.status === "fulfilled" && r.value === true);
}

// Fire-and-forget push (for non-critical writes)
export function pushSyncBg(phone) {
  pushSync(phone).then((ok) => {
    if (!ok) console.warn(`[sync] pushSyncBg(${phone}) returned false`);
  }).catch((e) => {
    console.error(`[sync] pushSyncBg(${phone}) threw:`, e);
  });
}
