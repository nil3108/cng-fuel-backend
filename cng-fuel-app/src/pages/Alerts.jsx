import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import BottomNav from "../components/BottomNav";
import { getAnomalies } from "../db/database";

export default function Alerts() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const ANOMALIES = getAnomalies();

  return (
    <div className="min-h-screen bg-brand-bg pb-20">
      <div className="bg-primary px-4 pt-6 pb-6 rounded-b-3xl shadow-lg">
        <h1 className="text-white text-2xl font-bold">{t.alerts}</h1>
        <p className="text-white/60 text-sm mt-1">
          {ANOMALIES.length} unresolved
        </p>
      </div>

      <div className="px-4 -mt-3">
        {ANOMALIES.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <svg className="w-12 h-12 text-green-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-600 text-sm">{t.noAlerts}</p>
          </div>
        ) : (
          ANOMALIES.map((a) => {
            const isLocation = a.type === "location";
            return (
              <div
                key={a.id}
                className={`bg-white rounded-2xl shadow-sm p-5 mb-4 border-l-4 ${isLocation ? "border-yellow-500" : "border-accent"}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-primary font-bold text-lg">{a.vehicleNo}</p>
                    <p className="text-xs text-gray-400">{a.date}</p>
                  </div>
                  {isLocation ? (
                    <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                      Location
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">
                      {a.deviation.toFixed(1)}% deviation
                    </span>
                  )}
                </div>

                {isLocation ? (
                  <div className="bg-yellow-50 rounded-xl p-3 mb-4">
                    <p className="text-xs text-gray-500 font-medium mb-2">Location Mismatch Detected</p>
                    <div className="text-sm">
                      <p className="text-gray-700">
                        Odometer photo was taken <strong>{a.distanceKm} km</strong> away from the CNG station.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Receipt at station, odometer photo taken elsewhere. Tap "View Fill History" to review.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-orange-50 rounded-xl p-3 mb-4">
                    <p className="text-xs text-gray-500 font-medium mb-2">{t.anomalyDetected}</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">{t.expectedKG}</p>
                        <p className="font-bold text-gray-800">{a.expectedKG} kg</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">{t.actualKG}</p>
                        <p className="font-bold text-red-600">{a.actualKG} kg</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">{t.deviation}</p>
                        <p className="font-bold text-accent">{a.deviation.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                )}

                {!isLocation && (
                  <p className="text-xs text-gray-500 mb-3">
                    Anomaly detected: billed KG is {a.deviation.toFixed(0)}% lower than expected based on historical average.
                  </p>
                )}

                <button
                  onClick={() => navigate(`/vehicle/${a.vehicleId}`)}
                  className="w-full bg-primary/10 text-primary font-semibold py-2.5 rounded-xl text-sm hover:bg-primary/20 transition-colors"
                >
                  {t.viewFillHistory}
                </button>
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
