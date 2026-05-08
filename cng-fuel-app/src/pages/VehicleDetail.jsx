import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import BottomNav from "../components/BottomNav";
import PhotoViewer from "../components/PhotoViewer";
import LocationMap from "../components/LocationMap";
import { getVehicle, getFillsByVehicle } from "../db/database";
import { downloadCsv } from "../utils/exportCsv";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const BASELINE_EFFICIENCY = 25;

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [strictMode, setStrictMode] = useState(false);
  const vehicle = getVehicle(id);
  const fills = getFillsByVehicle(id);

  const weekFills = fills.filter((f) => new Date(f.date) >= new Date(Date.now() - 7 * 86400000));
  const monthFills = fills.filter((f) => new Date(f.date) >= new Date(Date.now() - 30 * 86400000));

  const weekKg = weekFills.reduce((s, f) => s + (f.kg || 0), 0);
  const weekRs = weekFills.reduce((s, f) => s + (f.rs || 0), 0);
  const monthKg = monthFills.reduce((s, f) => s + (f.kg || 0), 0);
  const monthRs = monthFills.reduce((s, f) => s + (f.rs || 0), 0);

  const efficiency = useMemo(() => {
    return fills.slice(-14).map((f) => {
      const kmPerKg = f.kg > 0 ? (f.odometer ? (f.odometer / f.kg) : BASELINE_EFFICIENCY) : BASELINE_EFFICIENCY;
      return { day: f.date?.slice(5) || "—", kmPerKg: Math.round(kmPerKg * 10) / 10 };
    });
  }, [fills]);

  const avgEfficiency = efficiency.length > 0 ? (efficiency.reduce((s, d) => s + d.kmPerKg, 0) / efficiency.length).toFixed(1) : "0";
  const latestEff = efficiency.length > 0 ? efficiency[efficiency.length - 1].kmPerKg : 0;
  const prevEff = efficiency.length > 1 ? efficiency[efficiency.length - 2].kmPerKg : 0;
  const dropPercent = prevEff > 0 ? ((prevEff - latestEff) / prevEff) * 100 : 0;
  const hasAnomaly = dropPercent > 20;

  return (
    <div className="min-h-screen bg-brand-bg pb-20">
      <div className="bg-primary px-4 pt-6 pb-6">
        <button onClick={() => navigate("/dashboard")} className="text-white/60 flex items-center gap-1 text-sm mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <h1 className="text-white text-2xl font-bold">{vehicle?.regNo || "Vehicle"}</h1>
        <p className="text-white/60 text-sm mt-1">{vehicle?.driver || "—"}</p>
        {hasAnomaly && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2.5 mt-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <p className="text-red-300 text-sm font-medium">{t.anomalyAlert}</p>
          </div>
        )}
      </div>

      <div className="px-4 -mt-3">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard label={t.thisWeek} sub={`${weekKg.toFixed(1)} kg`} value={`Rs ${weekRs.toLocaleString()}`} />
          <StatCard label={t.thisMonth} sub={`${monthKg.toFixed(1)} kg`} value={`Rs ${monthRs.toLocaleString()}`} />
          <StatCard label={t.avgEfficiency} sub="km/kg" value={`${avgEfficiency}`} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-gray-700">Efficiency Trend</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{t.strictMode}</span>
              <button onClick={() => setStrictMode(!strictMode)} className={`w-10 h-5 rounded-full transition-colors relative ${strictMode ? "bg-accent" : "bg-gray-300"}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${strictMode ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={efficiency}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" domain={[15, 35]} />
                <Tooltip />
                <ReferenceLine y={BASELINE_EFFICIENCY} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "Baseline", fontSize: 10, fill: "#ef4444" }} />
                <Line type="monotone" dataKey="kmPerKg" stroke="#E30613" strokeWidth={2} dot={{ r: 3, fill: "#E30613" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">{t.fillHistory}</p>
            <button onClick={() => downloadCsv(fills.map((f) => ({ date: f.date, time: f.time, kg: f.kg, rs: f.rs, station: f.station, odometer: f.odometer, locationStatus: f.locationStatus })), `fills-${vehicle?.regNo || "vehicle"}`)} className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-primary/20 transition-colors">CSV</button>
          </div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {fills.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No fills recorded yet</p>
            ) : (
              fills.map((f) => <FillRow key={f.id} fill={f} />)
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function FillRow({ fill: f }) {
  const [showPhotos, setShowPhotos] = useState(false);
  let pinColor, pinTitle;
  if (f.locationStatus === "matched") { pinColor = "text-green-500"; pinTitle = "Location matched"; }
  else if (f.locationStatus === "mismatch") { pinColor = "text-yellow-500"; pinTitle = "Location mismatch"; }
  else { pinColor = "text-gray-400"; pinTitle = "Location unavailable"; }
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button onClick={() => setShowPhotos(!showPhotos)} className="w-full flex items-center justify-between py-2 px-1 hover:bg-gray-50 rounded-lg transition-colors text-left">
        <div className="flex items-center gap-2 min-w-0">
          <svg className={`w-4 h-4 shrink-0 ${pinColor}`} fill="currentColor" viewBox="0 0 24 24" title={pinTitle}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800">{f.date} · {f.time || "—"}</p>
            <p className="text-xs text-gray-400 truncate">{f.station || "—"}</p>
            {f.timeGapMin > 30 && <p className="text-xs text-yellow-600">{f.timeGapMin} min gap between photos</p>}
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <p className="text-sm font-bold text-gray-800">{f.kg || 0} kg</p>
          <p className="text-xs text-gray-500">Rs {f.rs || 0}</p>
        </div>
      </button>
      {showPhotos && f.photos && (
        <div className="px-2 pb-3">
          <PhotoViewer photos={f.photos} />
          <div className="mt-2">
            <LocationMap stationCoords={f.stationCoords} odometerCoords={f.odometerCoords} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, sub, value }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-3.5 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-extrabold text-primary mt-0.5">{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}
