import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import BottomNav from "../components/BottomNav";
import LanguageToggle from "../components/LanguageToggle";
import { getOwner, getVehicles, getFills, getAnomalies, getDrivers } from "../db/database";
import { downloadCsv } from "../utils/exportCsv";

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [fillFilter, setFillFilter] = useState("all");
  const [showAllFills, setShowAllFills] = useState(false);

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
    <div className="min-h-screen bg-brand-bg pb-20">
      <div className="bg-primary px-4 pt-6 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white/20 p-1" />
            <div>
              <p className="text-white/60 text-xs">Welcome back,</p>
              <h1 className="text-white font-bold text-xl">{owner?.fullName || "Owner"}</h1>
            </div>
          </div>
          <LanguageToggle />
        </div>
        <div className="bg-white/10 backdrop-blur rounded-2xl p-5">
          <p className="text-white/60 text-xs uppercase tracking-wider">{t.weeklySpend}</p>
          <p className="text-white text-4xl font-extrabold mt-1">Rs {weeklySpend.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="bg-accent/20 text-accent text-xs font-semibold px-2.5 py-1 rounded-full">{t.paymentDue} 7 {t.days}</div>
            <button onClick={() => navigate("/payment")} className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full hover:bg-accent/90 transition-colors">{t.payNow}</button>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4">
        {locationAnomalies.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 mb-3 flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-800">Location mismatch detected</p>
              <p className="text-xs text-yellow-700 mt-0.5">
                {locationAnomalies.map((a) => <span key={a.id}>{a.vehicleNo} — odometer photo {a.distanceKm}km from station. </span>)}
                <button onClick={() => navigate("/alerts")} className="underline font-medium">Review</button>
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-gray-500 text-sm font-medium">{t.vehicles}</p>
          {vehicles.length > 0 && (
            <button onClick={() => downloadCsv(vehicles, "my-vehicles")} className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-primary/20 transition-colors">Export CSV</button>
          )}
        </div>

        {vehicles.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-gray-400 text-sm mb-3">No vehicles added yet</p>
            <button onClick={() => navigate("/add-vehicle")} className="bg-primary text-white font-semibold py-2.5 px-6 rounded-xl text-sm">Add Vehicle</button>
          </div>
        ) : (
          vehicles.map((v) => {
            const todayFill = getTodayFill(v.id);
            const weekF = getWeekFills(v.id);
            const weekKg = weekF.reduce((s, f) => s + (f.kg || 0), 0).toFixed(1);
            const weekRs = weekF.reduce((s, f) => s + (f.rs || 0), 0);
            return (
              <div key={v.id} onClick={() => navigate(`/vehicle/${v.id}`)} className="bg-white rounded-2xl shadow-sm p-4 mb-3 active:scale-[0.99] transition-transform cursor-pointer">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-primary font-bold text-lg">{v.regNo}</p>
                    <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      {driverMap[v.id] || v.driver || "No driver"}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${todayFill ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {todayFill ? t.filled : t.notFilled}
                  </span>
                </div>
                <div className="flex gap-4 text-sm">
                  <div><p className="text-gray-400 text-xs">{t.thisWeekKG}</p><p className="font-bold text-gray-800">{weekKg} kg</p></div>
                  <div><p className="text-gray-400 text-xs">{t.thisWeekRs}</p><p className="font-bold text-gray-800">Rs {weekRs.toLocaleString()}</p></div>
                </div>
              </div>
            );
          })
        )}

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">Drivers</p>
            <div className="flex items-center gap-2">
              <button onClick={() => downloadCsv(drivers, "my-drivers")} className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-primary/20 transition-colors" title="Export CSV">CSV</button>
              <button onClick={() => navigate("/add-driver?skipTerms=true")} className="bg-accent text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-accent/90 transition-colors">+ Add Driver</button>
            </div>
          </div>
          {drivers.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">No drivers added yet</p>
          ) : (
            <div className="space-y-2">
              {drivers.map((d) => {
                const veh = vehicles.find((v) => v.id === d.vehicleId);
                return (
                  <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">{d.name}</p>
                      <p className="text-xs text-gray-400">{veh?.regNo || "—"}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs font-mono font-bold text-accent tracking-wider">{d.driverCode}</p>
                      <p className="text-[10px] text-gray-400">Driver Code</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {allFills.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">All Fill Records</p>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadCsv(allFills.map((f) => ({ vehicle: f.regNo, date: f.date, time: f.time, kg: f.kg, rs: f.rs, station: f.station, odometer: f.odometer, locationStatus: f.locationStatus })), "my-fills")} className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-primary/20 transition-colors" title="Export CSV">CSV</button>
                <select value={fillFilter} onChange={(e) => setFillFilter(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-primary">
                  {vehicleOptions.map((r) => <option key={r} value={r}>{r === "all" ? "All Vehicles" : r}</option>)}
                </select>
                <button onClick={() => navigate("/media")} className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/20">Media</button>
              </div>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredFills.map((f, i) => {
                const veh = vehicles.find((v) => v.id === f.vehicleId);
                const pinColor = f.locationStatus === "matched" ? "text-green-500" : f.locationStatus === "mismatch" ? "text-yellow-500" : "text-gray-400";
                return (
                  <div key={f.id || i} onClick={() => navigate(`/vehicle/${f.vehicleId}`)} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className={`w-3.5 h-3.5 shrink-0 ${pinColor}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                      <span className="text-xs font-semibold text-primary shrink-0">{veh?.regNo || f.regNo}</span>
                      <span className="text-xs text-gray-500 truncate">{f.date} · {f.station || "—"}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-700 shrink-0 ml-2">{f.kg}kg · Rs{f.rs}</span>
                  </div>
                );
              })}
            </div>
            {sortedFills.length > 5 && (
              <button onClick={() => setShowAllFills(!showAllFills)} className="w-full text-xs text-primary font-semibold py-2 mt-1 hover:bg-primary/5 rounded-lg transition-colors">
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
