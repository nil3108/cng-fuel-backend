import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getOwner as getLocalOwner, getVehicles as getLocalVehicles, getDrivers as getLocalDrivers, getFills as getLocalFills } from "../db/database";
import { pushSync } from "../db/sync";
import { downloadCsv } from "../utils/exportCsv";

const TABS = ["Overview", "Owners", "Vehicles", "Drivers", "Fills", "Media"];

function StatCard({ label, value, color }) {
  return (
    <div className="floating-card p-5 text-center">
      <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
      <p className="text-ink/40 text-xs mt-1.5 font-medium tracking-wide uppercase">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("Overview");
  const [previewImg, setPreviewImg] = useState(null);
  const [data, setData] = useState({ owners: [], vehicles: [], drivers: [], fills: [] });
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [syncMsg, setSyncMsg] = useState(null);
  const [showDiag, setShowDiag] = useState(false);
  const [rawEntries, setRawEntries] = useState([]);
  const [manualPhone, setManualPhone] = useState("");
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);

  function safeSignal(ms) {
    try { return AbortSignal.timeout(ms); } catch {
      const c = new AbortController();
      setTimeout(() => c.abort(), ms);
      return c.signal;
    }
  }

  function mergeWithLocal(backend) {
    const localOwner = getLocalOwner();
    const localVehicles = getLocalVehicles();
    const localDrivers = getLocalDrivers();
    const localFills = getLocalFills();
    if (!localOwner && localVehicles.length === 0 && localDrivers.length === 0 && localFills.length === 0) return backend;
    const merged = { ...backend };
    if (localOwner && !backend.owners.find((o) => o.phone === localOwner.phone)) merged.owners.push(localOwner);
    localVehicles.forEach((v) => { if (!merged.vehicles.find((x) => x.id === v.id)) merged.vehicles.push(v); });
    localDrivers.forEach((d) => { if (!merged.drivers.find((x) => x.id === d.id)) merged.drivers.push(d); });
    localFills.forEach((f) => { if (!merged.fills.find((x) => x.id === f.id)) merged.fills.push(f); });
    return merged;
  }

  const loadData = useCallback(async () => {
    try {
      const res = await fetch((window.API_URL || '') + "/api/sync/all", { signal: safeSignal(5000) });
      if (!res.ok) throw new Error("Not available");
      const all = await res.json();
      const owners = [];
      const vehicles = [];
      const drivers = [];
      const fills = [];
      all.forEach((u) => {
        if (u.data?.owner) owners.push(u.data.owner);
        if (Array.isArray(u.data?.vehicles)) vehicles.push(...u.data.vehicles);
        if (Array.isArray(u.data?.drivers)) drivers.push(...u.data.drivers);
        if (Array.isArray(u.data?.fills)) fills.push(...u.data.fills);
      });
      const backendData = { owners, vehicles, drivers, fills };
      const merged = mergeWithLocal(backendData);
      setData(merged);
      setUsingLocalFallback(merged !== backendData);
      setRawEntries(all.map((u) => ({
        phone: u.phone,
        updatedAt: u.updatedAt,
        hasOwner: !!u.data?.owner,
        vehicleCount: Array.isArray(u.data?.vehicles) ? u.data.vehicles.length : 0,
        driverCount: Array.isArray(u.data?.drivers) ? u.data.drivers.length : 0,
        fillCount: Array.isArray(u.data?.fills) ? u.data.fills.length : 0,
      })));
      setBackendStatus("online");
    } catch {
      const localData = mergeWithLocal({ owners: [], vehicles: [], drivers: [], fills: [] });
      setData(localData);
      setUsingLocalFallback(true);
      setBackendStatus("offline");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const fillsByVehicle = useMemo(() => {
    const map = {};
    data.fills.forEach((f) => { map[f.vehicleId] = (map[f.vehicleId] || 0) + 1; });
    return map;
  }, [data.fills]);

  const handleLogout = () => {
    sessionStorage.removeItem("cng_admin");
    navigate("/admin-login");
  };

  const videoFills = data.fills.filter((f) => f.photos && (Array.isArray(f.photos) ? f.photos.length > 0 : (f.photos.fillingVideo || f.photos.pumpMeter || f.photos.receipt || f.photos.odometer)));
  const allMedia = [];
  data.fills.forEach((f) => {
    if (f.photos?.fillingVideo) allMedia.push({ type: "Filling Video", fill: f, src: f.photos.fillingVideo });
    if (f.photos?.pumpMeter) allMedia.push({ type: "Pump Meter", fill: f, src: f.photos.pumpMeter });
    if (f.photos?.receipt) allMedia.push({ type: "Receipt", fill: f, src: f.photos.receipt });
    if (f.photos?.odometer) allMedia.push({ type: "Odometer", fill: f, src: f.photos.odometer });
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-primary text-ink flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-silver-dark text-sm font-light">Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary text-ink pb-24">
      {backendStatus === "offline" && (
        <div className="bg-yellow-500/10 text-yellow-300 text-xs text-center py-3 px-4 border-b border-yellow-500/10 font-light">
          Backend offline — showing data from last sync.
        </div>
      )}
      {usingLocalFallback && (
        <div className="bg-accent/10 text-accent text-xs text-center py-3 px-4 border-b border-accent/10 font-light">
          Showing localStorage data merged with backend. Use "Force Sync" below.
        </div>
      )}
      {previewImg && (
        <div className="fixed inset-0 z-[100] bg-ink/95 flex flex-col items-center justify-center" onClick={() => setPreviewImg(null)}>
          <button onClick={() => setPreviewImg(null)} className="absolute top-6 right-6 w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 z-10 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={previewImg} alt="Preview" className="max-w-[92vw] max-h-[80vh] rounded-3xl shadow-2xl object-contain" />
          <p className="text-white/20 text-xs mt-5 font-light">Tap anywhere to close</p>
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden pt-6 px-6 pb-4 border-b border-black/5">
        <div className="absolute top-[-30%] left-[-10%] w-[60%] h-[50%] bg-accent/5 rounded-full blur-[100px]" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Admin Panel</h1>
            <p className="text-silver-dark text-xs font-light mt-0.5">CNG Fuel Credit Service</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${backendStatus === "online" ? "bg-mint shadow-glow-mint" : backendStatus === "offline" ? "bg-yellow-400" : "bg-black/20"} transition-all`} title={`Backend ${backendStatus}`} />
            <button onClick={handleLogout} className="bg-black/5 hover:bg-black/10 text-silver-dark text-xs font-semibold px-4 py-2 rounded-xl transition-all border border-black/5">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6">
        {tab === "Overview" && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 mb-6">
              <StatCard label="Owners" value={data.owners.length} color="text-accent" />
              <StatCard label="Vehicles" value={data.vehicles.length} color="text-mint" />
              <StatCard label="Drivers" value={data.drivers.length} color="text-accent" />
              <StatCard label="Fill Records" value={data.fills.length} color="text-mint" />
            </div>

            <div className="floating-card p-5 mb-4">
              <p className="text-sm font-semibold text-ink/70 mb-4 tracking-wide">Recent Fills</p>
              {data.fills.length === 0 ? (
                <p className="text-silver-dark text-xs text-center py-6 font-light">No fill records yet</p>
              ) : (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {data.fills.slice(0, 20).map((f) => (
                    <div key={f.id} className="flex justify-between items-center py-2.5 border-b border-black/5 last:border-0 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-semibold text-ink">{f.regNo || "—"}</span>
                        <span className="text-silver-dark font-light truncate">{f.date} {f.station ? `· ${f.station}` : ""}</span>
                      </div>
                      <span className="text-ink/60 shrink-0 ml-2 font-medium">{f.kg}kg · Rs{f.rs}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="floating-card p-5 mb-4">
              <p className="text-sm font-semibold text-ink/70 mb-4 tracking-wide">Storage</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/5 rounded-2xl p-4">
                  <p className="text-silver-dark text-xs font-medium mb-1">Photos Stored</p>
                  <p className="text-2xl font-bold text-ink">{allMedia.length}</p>
                </div>
                <div className="bg-black/5 rounded-2xl p-4">
                  <p className="text-silver-dark text-xs font-medium mb-1">Fills w/ Photos</p>
                  <p className="text-2xl font-bold text-ink">{videoFills.length}</p>
                </div>
              </div>
            </div>

            <div className="floating-card p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-ink/70 tracking-wide">Sync & Diagnostics</p>
                <button onClick={() => setShowDiag(!showDiag)} className="text-silver-dark text-xs hover:text-ink transition-colors">{showDiag ? "Hide" : "Show"}</button>
              </div>
              {showDiag && (
                <div className="text-sm space-y-3">
                  <div className="bg-black/5 rounded-2xl p-4">
                    <p className="text-silver-dark text-xs font-medium mb-2">Backend DB (user_sync)</p>
                    <p className="text-ink">Synced phones: <span className="font-bold text-accent">{rawEntries.length}</span></p>
                    {rawEntries.length === 0 ? (
                      <p className="text-yellow-400/70 text-xs mt-2 font-light">No entries — table is empty</p>
                    ) : (
                      <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                        {rawEntries.map((e) => (
                          <div key={e.phone} className="bg-black/20 rounded-xl p-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                            <span className="text-ink font-medium">{e.phone}</span>
                            <span className="text-silver-dark">updated: {new Date(e.updatedAt).toLocaleString()}</span>
                            <span className="text-accent">{e.hasOwner ? "1 owner" : "0 owner"}</span>
                            <span className="text-mint">{e.vehicleCount} vehicles</span>
                            <span className="text-accent/80">{e.driverCount} drivers</span>
                            <span className="text-mint/80">{e.fillCount} fills</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-black/5 rounded-2xl p-4">
                    <p className="text-silver-dark text-xs font-medium mb-2">Local Browser</p>
                    <p className="text-sm"><span className="font-bold text-ink">{getLocalOwner() ? 1 : 0}</span> owners · <span className="font-bold text-ink">{getLocalVehicles().length}</span> vehicles · <span className="font-bold text-ink">{getLocalDrivers().length}</span> drivers · <span className="font-bold text-ink">{getLocalFills().length}</span> fills</p>
                  </div>
                  <button onClick={async () => {
                    setSyncMsg("Syncing...");
                    const phone = getLocalOwner()?.phone;
                    if (!phone) { setSyncMsg("No owner data in localStorage — login as owner first"); return; }
                    const ok = await pushSync(phone);
                    setSyncMsg(ok ? "Sync completed!" : "Sync failed — check browser console (F12) for errors");
                    setTimeout(() => setSyncMsg(null), 4000);
                    loadData();
                  }} className="w-full pill-button-primary text-sm">{syncMsg || "Force Sync localStorage → Backend"}</button>
                  {syncMsg && <p className="text-center text-sm font-medium text-ink/80">{syncMsg}</p>}
                  <div className="flex gap-2">
                    <input type="text" placeholder="Phone to force-sync" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} className="input-field text-sm flex-1" />
                    <button onClick={async () => {
                      if (!manualPhone) return;
                      setSyncMsg("Syncing...");
                      const ok = await pushSync(manualPhone);
                      setSyncMsg(ok ? "Synced!" : "Failed");
                      setTimeout(() => setSyncMsg(null), 4000);
                      loadData();
                    }} className="pill-button-secondary text-sm shrink-0">Sync</button>
                  </div>
                  <button onClick={async () => {
                    try {
                      const debugRes = await fetch((window.API_URL || '') + "/api/debug", { signal: safeSignal(5000) });
                      const debugData = await debugRes.json();
                      console.log("[admin] /api/debug:", debugData);
                      alert("Check browser console (F12) for /api/debug data");
                    } catch (e) {
                      console.error("[admin] /api/debug failed:", e);
                      alert("Debug endpoint failed");
                    }
                  }} className="w-full bg-black/5 hover:bg-black/10 text-silver-dark text-sm font-medium py-3 rounded-2xl transition-all">Log /api/debug to Console</button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "Owners" && (
          <div className="mt-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-ink/70 tracking-wide">All Owners ({data.owners.length})</p>
              {data.owners.length > 0 && <button onClick={() => downloadCsv(data.owners, "owners")} className="text-accent text-xs font-semibold hover:text-accent-light transition-colors">Export CSV</button>}
            </div>
            {data.owners.length === 0 ? (
              <div className="floating-card p-8 text-center"><p className="text-silver-dark text-sm font-light">No owners registered</p></div>
            ) : (
              <div className="floating-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-black/5 text-silver-dark text-xs uppercase tracking-wide">
                    <tr><th className="text-left px-5 py-3.5 font-medium">Name</th><th className="text-left px-5 py-3.5 font-medium">Phone</th><th className="text-left px-5 py-3.5 font-medium">Email</th><th className="text-right px-5 py-3.5 font-medium">Vehicles</th><th className="text-right px-5 py-3.5 font-medium">Drivers</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.owners.map((o) => (
                      <tr key={o.phone} className="hover:bg-black/[0.02] transition-colors">
                        <td className="px-5 py-4 font-medium text-ink">{o.fullName || o.name || o.businessName || "—"}</td>
                        <td className="px-5 py-4 text-silver-dark">{o.phone || "—"}</td>
                        <td className="px-5 py-4 text-silver-dark">{o.email || "—"}</td>
                        <td className="px-5 py-4 text-right text-ink">{data.vehicles.filter((v) => v.ownerPhone === o.phone).length}</td>
                        <td className="px-5 py-4 text-right text-ink">{data.drivers.filter((d) => d.ownerPhone === o.phone).length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "Vehicles" && (
          <div className="mt-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-ink/70 tracking-wide">All Vehicles ({data.vehicles.length})</p>
              {data.vehicles.length > 0 && <button onClick={() => downloadCsv(data.vehicles.map((v) => ({ ...v, fillCount: fillsByVehicle[v.id] || 0 })), "vehicles")} className="text-accent text-xs font-semibold hover:text-accent-light transition-colors">Export CSV</button>}
            </div>
            {data.vehicles.length === 0 ? (
              <div className="floating-card p-8 text-center"><p className="text-silver-dark text-sm font-light">No vehicles added</p></div>
            ) : (
              <div className="floating-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-black/5 text-silver-dark text-xs uppercase tracking-wide">
                    <tr><th className="text-left px-5 py-3.5 font-medium">Reg No</th><th className="text-left px-5 py-3.5 font-medium">Brand/Model</th><th className="text-left px-5 py-3.5 font-medium">Owner</th><th className="text-right px-5 py-3.5 font-medium">Fills</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.vehicles.map((v) => {
                      const owner = data.owners.find((o) => o.phone === v.ownerPhone);
                      return (<tr key={v.id} className="hover:bg-black/[0.02] transition-colors">
                        <td className="px-5 py-4 font-medium text-ink">{v.regNo}</td>
                        <td className="px-5 py-4 text-silver-dark">{v.brand || v.make || "—"}{v.model ? " " + v.model : ""}</td>
                        <td className="px-5 py-4 text-silver-dark">{owner?.fullName || owner?.name || "—"}</td>
                        <td className="px-5 py-4 text-right text-ink">{fillsByVehicle[v.id] || 0}</td>
                      </tr>);
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "Drivers" && (
          <div className="mt-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-ink/70 tracking-wide">All Drivers ({data.drivers.length})</p>
              {data.drivers.length > 0 && <button onClick={() => downloadCsv(data.drivers, "drivers")} className="text-accent text-xs font-semibold hover:text-accent-light transition-colors">Export CSV</button>}
            </div>
            {data.drivers.length === 0 ? (
              <div className="floating-card p-8 text-center"><p className="text-silver-dark text-sm font-light">No drivers added</p></div>
            ) : (
              <div className="floating-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-black/5 text-silver-dark text-xs uppercase tracking-wide">
                    <tr><th className="text-left px-5 py-3.5 font-medium">Name</th><th className="text-left px-5 py-3.5 font-medium">Phone</th><th className="text-left px-5 py-3.5 font-medium">Vehicle</th><th className="text-left px-5 py-3.5 font-medium">Code</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.drivers.map((d) => {
                      const veh = data.vehicles.find((v) => v.id === d.vehicleId);
                      return (<tr key={d.id} className="hover:bg-black/[0.02] transition-colors">
                        <td className="px-5 py-4 font-medium text-ink">{d.name}</td>
                        <td className="px-5 py-4 text-silver-dark">{d.phone || d.mobile || "—"}</td>
                        <td className="px-5 py-4 text-silver-dark">{veh?.regNo || "—"}</td>
                        <td className="px-5 py-4"><span className="font-mono font-bold text-accent tracking-wider">{d.driverCode}</span></td>
                      </tr>);
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "Fills" && (
          <div className="mt-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-ink/70 tracking-wide">All Fill Records ({data.fills.length})</p>
              {data.fills.length > 0 && (
                <button onClick={() => downloadCsv(data.fills.map((f) => ({
                  id: f.id, vehicle: f.regNo, driver: f.driver, date: f.date, time: f.time,
                  kg: f.kg, rs: f.rs, station: f.station, odometer: f.odometer,
                  locationStatus: f.locationStatus, timeGapMin: f.timeGapMin,
                })), "fills")} className="text-accent text-xs font-semibold hover:text-accent-light transition-colors">Export CSV</button>
              )}
            </div>
            {data.fills.length === 0 ? (
              <div className="floating-card p-8 text-center"><p className="text-silver-dark text-sm font-light">No fill records yet</p></div>
            ) : (
              <div className="floating-card overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead className="bg-black/5 text-silver-dark text-xs uppercase tracking-wide">
                    <tr><th className="text-left px-4 py-3.5 font-medium">Vehicle</th><th className="text-left px-4 py-3.5 font-medium">Date</th><th className="text-right px-4 py-3.5 font-medium">KG</th><th className="text-right px-4 py-3.5 font-medium">Rs</th><th className="text-left px-4 py-3.5 font-medium">Station</th><th className="text-left px-4 py-3.5 font-medium">Status</th><th className="text-center px-4 py-3.5 font-medium">Photos</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.fills.map((f) => (
                      <tr key={f.id} className="hover:bg-black/[0.02] transition-colors">
                        <td className="px-4 py-3.5 font-medium text-ink">{f.regNo || "—"}</td>
                        <td className="px-4 py-3.5 text-silver-dark">{f.date}</td>
                        <td className="px-4 py-3.5 text-right text-ink">{f.kg}</td>
                        <td className="px-4 py-3.5 text-right text-ink">{f.rs}</td>
                        <td className="px-4 py-3.5 text-silver-dark truncate max-w-[100px]">{f.station || "—"}</td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${f.locationStatus === "matched" ? "bg-mint/10 text-mint" : f.locationStatus === "mismatch" ? "bg-yellow-500/10 text-yellow-400" : "bg-black/5 text-silver-dark"}`}>{f.locationStatus}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {(f.photos?.fillingVideo || f.photos?.pumpMeter || f.photos?.receipt || f.photos?.odometer) ? (
                            <div className="flex justify-center gap-1.5">
                              {f.photos?.fillingVideo && <button onClick={() => setPreviewImg(f.photos.fillingVideo)} className="w-7 h-7 bg-accent/10 rounded-lg flex items-center justify-center hover:bg-accent/20 transition-colors" title="Filling Video"><svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>}
                              {f.photos?.pumpMeter && <button onClick={() => setPreviewImg(f.photos.pumpMeter)} className="w-7 h-7 bg-black/5 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors" title="Pump Meter"><svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></button>}
                              {f.photos?.receipt && <button onClick={() => setPreviewImg(f.photos.receipt)} className="w-7 h-7 bg-black/5 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors" title="Receipt"><svg className="w-3.5 h-3.5 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></button>}
                              {f.photos?.odometer && <button onClick={() => setPreviewImg(f.photos.odometer)} className="w-7 h-7 bg-black/5 rounded-lg flex items-center justify-center hover:bg-black/10 transition-colors" title="Odometer"><svg className="w-3.5 h-3.5 text-accent/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>}
                            </div>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "Media" && (
          <div className="mt-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-ink/70 tracking-wide">All Media ({allMedia.length})</p>
              <p className="text-silver-dark text-xs font-light">Tap to view</p>
            </div>
            {allMedia.length === 0 ? (
              <div className="floating-card p-8 text-center"><p className="text-silver-dark text-sm font-light">No media uploaded yet</p></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {allMedia.map((m, i) => (
                  <button key={i} onClick={() => setPreviewImg(m.src)} className="floating-card overflow-hidden text-left group">
                    <div className="aspect-square bg-primary relative">
                      <img src={m.src} alt={m.type} className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 text-[10px] font-semibold bg-white/60 text-ink px-2 py-1 rounded-lg backdrop-blur">{m.type}</span>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-ink truncate">{m.fill.regNo || "—"}</p>
                      <p className="text-xs text-silver-dark font-light">{m.fill.date}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Tabs */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="glass-card rounded-none rounded-t-3xl border-t-0 mx-0">
          <div className="max-w-5xl mx-auto flex overflow-x-auto">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 min-w-[60px] py-3.5 text-xs font-semibold tracking-wide transition-all duration-300 ${tab === t ? "text-accent bg-accent/5" : "text-ink/30 hover:text-ink/60"}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}