import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import BottomNav from "../components/BottomNav";
import LanguageToggle from "../components/LanguageToggle";
import { getOwner, getVehicles, getFills, getAnomalies, getDrivers } from "../db/database";
import { pullSync, pushSync } from "../db/sync";
import { downloadCsv } from "../utils/exportCsv";

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [fillFilter, setFillFilter] = useState("all");
  const [showAllFills, setShowAllFills] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [syncStatus, setSyncStatus] = useState("");

  useEffect(() => {
    const phone = getOwner()?.phone;
    if (phone) {
      pullSync(phone).then(() => setRefresh((r) => r + 1));
      const interval = setInterval(() => {
        pullSync(phone).then(() => setRefresh((r) => r + 1));
      }, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleSync = async () => {
    setSyncStatus("Syncing...");
    const phone = getOwner()?.phone;
    if (!phone) { setSyncStatus("No phone"); return; }
    const ok = await pushSync(phone);
    setSyncStatus(ok ? "Synced!" : "Failed");
    setTimeout(() => setSyncStatus(""), 3000);
  };

  const owner = getOwner();
  const vehicles = getVehicles();
  const allFills = getFills();
  const anomalies = getAnomalies();
  const drivers = getDrivers();

  const locationAnomalies = anomalies.filter((a) => a.type === "location");

  const getTodayFill = (vehicleId) => {
    const today = new Date().toISOString().slice(0, 10);
    return allFills.find((f) => f.vehicleId === vehicleId && f.date === today);
  };

  const getWeekFills = (vehicleId) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return allFills.filter((f) => f.vehicleId === vehicleId && new Date(f.date) >= weekAgo);
  };

  const driverMap = {};
  allFills.forEach((f) => { if (f.driver) driverMap[f.vehicleId] = f.driver; });

  const sortedFills = useMemo(() => {
    return [...allFills].sort((a, b) => new Date(b.date + "T" + (b.time || "00:00")) - new Date(a.date + "T" + (a.time || "00:00")));
  }, [allFills]);

  const filteredFills = useMemo(() => {
    let list = showAllFills ? sortedFills : sortedFills.slice(0, 5);
    if (fillFilter === "all") return list;
    const veh = vehicles.find((v) => v.regNo === fillFilter);
    return list.filter((f) => f.vehicleId === veh?.id);
  }, [sortedFills, fillFilter, showAllFills, vehicles]);

  const vehicleOptions = ["all", ...vehicles.map((v) => v.regNo)];

  const weeklySpend = allFills
    .filter((f) => new Date(f.date) >= new Date(Date.now() - 7 * 86400000))
    .reduce((s, f) => s + (f.rs || 0), 0);

  return (
    <div className="min-h-screen bg-primary pb-24">
      {/* Header */}
      <div className="relative overflow-hidden pt-6 px-6 pb-8">
        <div className="absolute top-[-40%] left-[-20%] w-[80%] h-[60%] bg-accent/8 rounded-full blur-[120px]" />
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <img src="/logo.jpg" alt="Logo" className="w-12 h-12 object-contain rounded-xl" />
              <div>
                <p className="text-ink/40 text-xs font-light tracking-wide">Welcome back,</p>
                <h1 className="text-ink font-bold text-xl tracking-tight">{owner?.fullName || "Owner"}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleSync} className="bg-black/5 hover:bg-black/10 text-ink text-xs px-3 py-1.5 rounded-xl transition-all duration-300 border border-black/5" title="Sync data">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  {syncStatus || "Sync"}
                </span>
              </button>
              <LanguageToggle />
            </div>
          </div>

          {/* Weekly Spend Card */}
          <div className="floating-card p-6 bg-gradient-to-br from-accent/10 to-transparent border border-accent/10">
            <p className="text-ink/40 text-xs uppercase tracking-[0.2em] font-medium">{t.weeklySpend}</p>
            <p className="text-ink text-4xl font-extrabold mt-2 tracking-tight">Rs {weeklySpend.toLocaleString()}</p>
            <div className="flex items-center gap-3 mt-4">
              <div className="bg-mint/10 text-mint text-xs font-semibold px-3 py-1.5 rounded-full">{t.paymentDue} 7 {t.days}</div>
              <button onClick={() => navigate("/payment")} className="pill-button-mint text-xs !px-4 !py-1.5">{t.payNow}</button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6">
        {/* Anomalies */}
        {locationAnomalies.length > 0 && (
          <div className="floating-card p-4 mb-4 border border-yellow-500/10 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-300">Location mismatch detected</p>
                <p className="text-xs text-yellow-400/70 mt-1 font-light">
                  {locationAnomalies.map((a) => <span key={a.id}>{a.vehicleNo} — odometer photo {a.distanceKm}km from station. </span>)}
                  <button onClick={() => navigate("/alerts")} className="underline font-medium text-yellow-300">Review</button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Vehicles Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-ink/60 text-sm font-medium tracking-wide uppercase">{t.vehicles}</p>
          {vehicles.length > 0 && (
            <button onClick={() => downloadCsv(vehicles, "my-vehicles")} className="text-accent text-xs font-semibold hover:text-accent-light transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export CSV
            </button>
          )}
        </div>

        {vehicles.length === 0 ? (
          <div className="floating-card p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-silver-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-silver-dark text-sm mb-4 font-light">No vehicles added yet</p>
            <button onClick={() => navigate("/add-vehicle")} className="pill-button-primary text-sm">Add Vehicle</button>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {vehicles.map((v) => {
              const todayFill = getTodayFill(v.id);
              const weekF = getWeekFills(v.id);
              const weekKg = weekF.reduce((s, f) => s + (f.kg || 0), 0).toFixed(1);
              const weekRs = weekF.reduce((s, f) => s + (f.rs || 0), 0);
              return (
                <div key={v.id} onClick={() => navigate(`/vehicle/${v.id}`)} className="floating-card p-5 cursor-pointer active:scale-[0.99] transition-all duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-ink font-bold text-lg tracking-tight">{v.regNo}</p>
                      <p className="text-silver-dark text-xs flex items-center gap-1.5 mt-1 font-light">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {driverMap[v.id] || v.driver || "No driver"}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${todayFill ? "bg-mint/10 text-mint" : "bg-black/5 text-silver-dark"}`}>
                      {todayFill ? t.filled : t.notFilled}
                    </span>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div><p className="text-ink/40 text-xs uppercase tracking-wide font-medium">{t.thisWeekKG}</p><p className="font-bold text-ink mt-0.5">{weekKg} kg</p></div>
                    <div><p className="text-ink/40 text-xs uppercase tracking-wide font-medium">{t.thisWeekRs}</p><p className="font-bold text-ink mt-0.5">Rs {weekRs.toLocaleString()}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Fill Records */}
        {allFills.length > 0 && (
          <div className="floating-card p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-ink/70 text-sm font-semibold tracking-wide">{t.fillRecords}</p>
              <div className="flex gap-2">
                <select value={fillFilter} onChange={(e) => setFillFilter(e.target.value)} className="bg-black/5 border border-black/10 rounded-xl px-3 py-1.5 text-xs text-ink outline-none">
                  <option className="bg-primary" value="all">All</option>
                  {vehicleOptions.filter((v) => v !== "all").map((v) => <option className="bg-primary" key={v} value={v}>{v}</option>)}
                </select>
                <button onClick={() => downloadCsv(allFills, "fills")} className="text-accent text-xs font-semibold hover:text-accent-light transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </button>
              </div>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {filteredFills.map((f, i) => {
                const veh = vehicles.find((v) => v.id === f.vehicleId);
                const pinColor = f.locationStatus === "matched" ? "text-mint" : f.locationStatus === "mismatch" ? "text-yellow-400" : "text-silver-dark";
                return (
                  <div key={f.id || i} onClick={() => navigate(`/vehicle/${f.vehicleId}`)} className="flex items-center justify-between py-3 border-b border-black/5 last:border-0 cursor-pointer hover:bg-black/[0.02] -mx-2 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <svg className={`w-3.5 h-3.5 shrink-0 ${pinColor}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                      <span className="text-sm font-semibold text-ink shrink-0">{veh?.regNo || f.regNo}</span>
                      <span className="text-xs text-silver-dark font-light truncate">{f.date} · {f.station || "—"}</span>
                    </div>
                    <span className="text-sm font-bold text-ink shrink-0 ml-2">{f.kg}kg · Rs{f.rs}</span>
                  </div>
                );
              })}
            </div>
            {sortedFills.length > 5 && (
              <button onClick={() => setShowAllFills(!showAllFills)} className="w-full text-xs text-accent font-semibold py-3 mt-2 hover:bg-accent/5 rounded-xl transition-colors">
                {showAllFills ? "Show Less" : `View All ${sortedFills.length} Fills`}
              </button>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}