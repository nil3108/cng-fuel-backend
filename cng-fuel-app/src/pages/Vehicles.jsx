import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import BottomNav from "../components/BottomNav";
import { getVehicles, getFills, getDrivers } from "../db/database";

export default function Vehicles() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const vehicles = getVehicles();
  const fills = getFills();
  const drivers = getDrivers();

  const [filter, setFilter] = useState("all");

  const vehicleOptions = ["all", ...vehicles.map((v) => v.regNo)];

  return (
    <div className="min-h-screen bg-primary pb-24">
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink tracking-tight">{t.vehicles}</h1>
          <button onClick={() => navigate("/add-vehicle")} className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-accent-dark transition-all shadow-glow">
            + Add
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {vehicleOptions.map((v) => (
            <button key={v} onClick={() => setFilter(v)} className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${filter === v ? "bg-accent text-white shadow-glow" : "bg-black/5 text-silver-dark hover:bg-black/10"}`}>
              {v === "all" ? "All" : v}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 space-y-3">
        {vehicles.length === 0 ? (
          <div className="floating-card p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-silver-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-silver-dark text-sm font-light">No vehicles added</p>
            <button onClick={() => navigate("/add-vehicle")} className="pill-button-primary text-sm mt-4">Add Vehicle</button>
          </div>
        ) : (
          vehicles.filter((v) => filter === "all" || v.regNo === filter).map((v) => {
            const vFills = fills.filter((f) => f.vehicleId === v.id);
            const vDrivers = drivers.filter((d) => d.vehicleId === v.id);
            return (
              <div key={v.id} onClick={() => navigate(`/vehicle/${v.id}`)} className="floating-card p-5 cursor-pointer active:scale-[0.99] transition-all duration-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-ink font-bold text-lg tracking-tight">{v.regNo}</p>
                    <p className="text-silver-dark text-xs mt-0.5 font-light">{v.make || v.brand || "—"} {v.model || ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-accent">{vFills.length}</p>
                    <p className="text-[10px] text-silver-dark uppercase tracking-wide font-medium">Fills</p>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-silver-dark font-light">
                  <span>{v.year || "N/A"} · {v.fuelType || "CNG"}</span>
                  {vDrivers.length > 0 && <span>{vDrivers.length} driver{vDrivers.length > 1 ? "s" : ""}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}