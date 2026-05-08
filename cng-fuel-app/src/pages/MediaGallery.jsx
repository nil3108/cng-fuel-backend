import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import BottomNav from "../components/BottomNav";
import PhotoViewer from "../components/PhotoViewer";
import LocationMap from "../components/LocationMap";
import { getFills } from "../db/database";

export default function MediaGallery() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const allFills = useMemo(() => {
    return getFills().sort((a, b) => new Date(b.date + "T" + b.time) - new Date(a.date + "T" + a.time));
  }, []);

  const filteredFills = useMemo(() => {
    return allFills.filter((f) => {
      if (vehicleFilter !== "all" && f.regNo !== vehicleFilter) return false;
      if (statusFilter !== "all" && f.locationStatus !== statusFilter) return false;
      return true;
    });
  }, [allFills, vehicleFilter, statusFilter]);

  const vehicleOptions = [...new Set(allFills.map((f) => f.regNo))];
  const totalPhotos = filteredFills.length * 3;

  return (
    <div className="min-h-screen bg-brand-bg pb-20">
      <div className="bg-primary px-4 pt-6 pb-6 rounded-b-3xl shadow-lg">
        <h1 className="text-white text-2xl font-bold">Media Gallery</h1>
        <p className="text-white/60 text-sm mt-1">
          {filteredFills.length} fills · {totalPhotos} photos for cross-verification
        </p>
      </div>

      <div className="px-4 -mt-3">
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 font-medium mb-1 block">Vehicle</label>
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="all">All Vehicles</option>
                {vehicleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 font-medium mb-1 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="all">All Status</option>
                <option value="matched">Matched</option>
                <option value="mismatch">Mismatch</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>
          <div className="text-xs text-gray-400 text-right">
            Showing {filteredFills.length} of {allFills.length} fills
          </div>
        </div>

        {filteredFills.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 text-sm">No fills match the selected filters</p>
          </div>
        ) : (
          filteredFills.map((f, i) => {
            const isExpanded = expanded === `${f.vehicleId}-${i}`;
            return (
              <div key={`${f.vehicleId}-${i}`} className="bg-white rounded-2xl shadow-sm mb-3 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg className={`w-4 h-4 ${f.locationStatus === "matched" ? "text-green-500" : f.locationStatus === "mismatch" ? "text-yellow-500" : "text-gray-400"}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                      <div>
                        <p className="text-primary font-bold text-base">{f.regNo}</p>
                        <p className="text-xs text-gray-400">{f.driver}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      f.locationStatus === "matched" ? "bg-green-100 text-green-700" :
                      f.locationStatus === "mismatch" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {f.locationStatus}
                    </span>
                  </div>

                  <PhotoViewer photos={f.photos} />

                  <div className="text-sm space-y-1 bg-gray-50 rounded-xl p-3 mt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{f.date} · {f.time}</span>
                      <span className="font-bold">{f.kg} kg · Rs {f.rs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-xs">{f.station}</span>
                      <span className="text-gray-400 text-xs">{f.odometer} km</span>
                    </div>
                    {f.locationStatus === "mismatch" && f.stationCoords && f.odometerCoords && (
                      <div className="text-yellow-600 text-xs font-medium">
                        GPS: station ({f.stationCoords.lat.toFixed(4)}, {f.stationCoords.lng.toFixed(4)}) vs odometer ({f.odometerCoords.lat.toFixed(4)}, {f.odometerCoords.lng.toFixed(4)})
                      </div>
                    )}
                    {f.locationStatus === "unavailable" && (
                      <div className="text-gray-400 text-xs">GPS: Location unavailable for odometer photo</div>
                    )}
                    {f.timeGapMin > 30 && (
                      <div className="text-yellow-600 text-xs">{f.timeGapMin} min gap between photos — flagged</div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-100 flex">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : `${f.vehicleId}-${i}`)}
                    className="flex-1 py-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    {isExpanded ? "Hide Details" : "Full Details"}
                  </button>
                  <button
                    onClick={() => navigate(`/vehicle/${f.vehicleId}`)}
                    className="flex-1 py-2.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors border-l border-gray-100"
                  >
                    View Vehicle
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <div className="px-4 py-3">
                      <LocationMap stationCoords={f.stationCoords} odometerCoords={f.odometerCoords} />
                    </div>
                    <div className="px-4 py-3 bg-gray-50 text-xs space-y-1.5 border-t border-gray-100">
                      <p><span className="text-gray-400">Station Photo:</span> {f.stationPhotoTimestamp?.replace("T", " ").slice(0, 16) || "—"}</p>
                      <p><span className="text-gray-400">Odometer Photo:</span> {f.odometerPhotoTimestamp?.replace("T", " ").slice(0, 16) || "—"}</p>
                      <p><span className="text-gray-400">Time Gap:</span> {f.timeGapMin?.toFixed(0) || "—"} min{f.timeGapMin > 30 ? " Flagged (>30min)" : ""}</p>
                      <p><span className="text-gray-400">Station Coords:</span> {f.stationCoords ? `${f.stationCoords.lat.toFixed(6)}, ${f.stationCoords.lng.toFixed(6)}` : "—"}</p>
                      <p><span className="text-gray-400">Odometer Coords:</span> {f.odometerCoords ? `${f.odometerCoords.lat.toFixed(6)}, ${f.odometerCoords.lng.toFixed(6)}` : "Unavailable"}</p>
                      <p><span className="text-gray-400">Status:</span> {f.locationStatus}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
