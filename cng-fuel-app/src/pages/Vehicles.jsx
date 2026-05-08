import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import BottomNav from "../components/BottomNav";
import { getVehicles, getFills } from "../db/database";
import { downloadCsv } from "../utils/exportCsv";

export default function Vehicles() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const fills = getFills();

  const getTodayFill = (vehicleId) => {
    const vehicleFills = fills.filter((f) => f.vehicleId === vehicleId);
    const today = new Date().toISOString().slice(0, 10);
    return vehicleFills.find((f) => f.date === today) || null;
  };

  const getWeekKg = (vehicleId) => {
    const vehicleFills = fills.filter((f) => f.vehicleId === vehicleId);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const ws = weekStart.toISOString().slice(0, 10);
    return vehicleFills.filter((f) => f.date >= ws).reduce((s, f) => s + f.kg, 0).toFixed(1);
  };

  const getWeekRs = (vehicleId) => {
    const vehicleFills = fills.filter((f) => f.vehicleId === vehicleId);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const ws = weekStart.toISOString().slice(0, 10);
    return vehicleFills.filter((f) => f.date >= ws).reduce((s, f) => s + f.rs, 0);
  };

  return (
    <div className="min-h-screen bg-brand-bg pb-20">
      <div className="bg-primary px-4 pt-6 pb-6 rounded-b-3xl shadow-lg">
        <h1 className="text-white text-2xl font-bold">{t.vehicles}</h1>
        <div className="flex items-center justify-between">
          <p className="text-white/60 text-sm">{getVehicles().length} vehicles</p>
          <button onClick={() => downloadCsv(getVehicles(), "my-vehicles")} className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-lg hover:bg-white/30 transition-colors">Export CSV</button>
        </div>
      </div>

      <div className="px-4 -mt-3">
        {getVehicles().map((v) => {
          const todayFill = getTodayFill(v.id);
          return (
            <div
              key={v.id}
              onClick={() => navigate(`/vehicle/${v.id}`)}
              className="bg-white rounded-2xl shadow-sm p-4 mb-3 active:scale-[0.99] transition-transform cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-primary font-bold text-lg">{v.regNo}</p>
                  <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {v.driver}
                  </p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  todayFill ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                }`}>
                  {todayFill ? t.filled : t.notFilled}
                </span>
              </div>
              <div className="flex gap-4 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">{t.thisWeekKG}</p>
                  <p className="font-bold text-gray-800">{getWeekKg(v.id)} kg</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">{t.thisWeekRs}</p>
                  <p className="font-bold text-gray-800">Rs {getWeekRs(v.id).toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
