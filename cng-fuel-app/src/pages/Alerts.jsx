import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import BottomNav from "../components/BottomNav";
import { getAnomalies, getVehicles } from "../db/database";

export default function Alerts() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const anomalies = getAnomalies();
  const vehicles = getVehicles();

  return (
    <div className="min-h-screen bg-primary pb-24">
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-ink tracking-tight mb-2">{t.alertsNav}</h1>
        <p className="text-silver-dark text-sm font-light">{anomalies.length} alert{anomalies.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="px-6 space-y-3">
        {anomalies.length === 0 ? (
          <div className="floating-card p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-mint/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-ink/70 text-sm font-medium">All Clear</p>
            <p className="text-silver-dark text-xs mt-1 font-light">No anomalies detected</p>
          </div>
        ) : (
          anomalies.map((a) => {
            const veh = vehicles.find((v) => v.id === a.vehicleId);
            return (
              <div key={a.id} className={`floating-card p-5 border ${a.type === "location" ? "border-yellow-500/10" : "border-red-500/10"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${a.type === "location" ? "bg-yellow-500/10" : "bg-red-500/10"}`}>
                    <svg className={`w-5 h-5 ${a.type === "location" ? "text-yellow-400" : "text-red-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {a.type === "location" ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 17h-1v-4h-1m1-8h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                      )}
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">{veh?.regNo || a.vehicleNo}</p>
                    <p className="text-xs text-silver-dark mt-1 font-light">
                      {a.type === "location"
                        ? `Odometer photo was taken ${a.distanceKm}km from the station`
                        : `Expected ~${a.expectedKG}kg, got ${a.actualKG}kg (${a.deviation}% below avg)`}
                    </p>
                  </div>
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