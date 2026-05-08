import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { getDriverByCode, getVehicle, getDrivers } from "../db/database";
import { API_URL } from "../config";

export default function DriverLink() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { setDriverInfo } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function safeSignal(ms) {
    try { return AbortSignal.timeout(ms); } catch {
      const c = new AbortController();
      setTimeout(() => c.abort(), ms);
      return c.signal;
    }
  }

  async function findDriverOnBackend(driverCode) {
    try {
      const res = await fetch(API_URL + "/api/sync/all", { signal: safeSignal(10000) });
      if (!res.ok) return null;
      const all = await res.json();
      for (const entry of all) {
        if (Array.isArray(entry.data?.drivers)) {
          const found = entry.data.drivers.find((d) => String(d.driverCode) === String(driverCode));
          if (found) return { driver: found, allData: entry.data };
        }
      }
    } catch (e) {
      console.error("[driver] backend lookup failed:", e);
    }
    return null;
  }

  function saveVehicle(v) {
    try {
      const existing = JSON.parse(localStorage.getItem("cng_vehicles") || "[]");
      if (!existing.find((ev) => ev.id === v.id)) {
        existing.push(v);
        localStorage.setItem("cng_vehicles", JSON.stringify(existing));
        console.log("[driver] saved vehicle:", v.id, v.regNo);
      }
    } catch {}
  }

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError("");

    let driver = getDriverByCode(code);
    let foundVehicles = null;
    if (!driver) {
      const result = await findDriverOnBackend(code);
      if (result) {
        driver = result.driver;
        foundVehicles = result.allData?.vehicles || [];
        if (driver && !getDrivers().find((d) => String(d.driverCode) === String(code))) {
          const drivers = getDrivers();
          drivers.push(driver);
          try { localStorage.setItem("cng_drivers", JSON.stringify(drivers)); } catch {}
        }
      }
    }

    if (!driver) {
      setError("Invalid code. Please check with the fleet owner.");
      setLoading(false);
      return;
    }

    if (foundVehicles && !getVehicle(driver.vehicleId)) {
      const matchedVehicle = foundVehicles.find((v) => v.id === driver.vehicleId);
      if (matchedVehicle) saveVehicle(matchedVehicle);
    }

    if (!getVehicle(driver.vehicleId)) {
      const res = await fetch(API_URL + "/api/vehicles/all", { signal: safeSignal(8000) }).catch(() => null);
      if (res?.ok) {
        const allVehicles = await res.json();
        const match = allVehicles.find((v) => v.id === driver.vehicleId);
        if (match) {
          console.log("[driver] fetched vehicle from backend:", match);
          saveVehicle(match);
        }
      }
    }

    if (!getVehicle(driver.vehicleId)) {
      const allRes = await fetch(API_URL + "/api/sync/all", { signal: safeSignal(8000) }).catch(() => null);
      if (allRes?.ok) {
        const entries = await allRes.json();
        for (const entry of entries) {
          if (Array.isArray(entry.data?.vehicles)) {
            const match = entry.data.vehicles.find((v) => v.id === driver.vehicleId);
            if (match) { saveVehicle(match); break; }
          }
        }
      }
    }

    const vehicle = getVehicle(driver.vehicleId);
    if (!vehicle) {
      setError("Linked vehicle not found. Contact the fleet owner.");
      setLoading(false);
      return;
    }

    setDriverInfo({
      driverId: driver.id,
      driverName: driver.name,
      vehicleId: driver.vehicleId,
      regNo: vehicle.regNo,
    });

    navigate("/fill");
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-[-30%] right-[-10%] w-[60%] h-[50%] bg-accent/5 rounded-full blur-[100px]" />

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        <button onClick={() => navigate("/")} className="text-silver-dark hover:text-ink mb-8 flex items-center gap-2 text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>

        <div className="flex flex-col items-center mb-8">
          <img src="/logo.jpg" alt="Logo" className="w-[200px] h-[200px] object-contain rounded-2xl mb-6" />
          <h2 className="text-2xl font-bold text-ink text-center tracking-tight">Enter Driver Code</h2>
          <p className="text-silver-dark text-sm mt-1 font-light">Ask the fleet owner for your 6-digit code</p>
        </div>

        <div className="glass-card p-6 mb-4">
          <label className="text-silver-dark text-sm font-medium mb-3 block tracking-wide">6-Digit Code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
            placeholder="000000"
            className="w-full bg-black/5 border border-black/10 rounded-2xl px-4 py-4 text-ink text-3xl font-bold text-center tracking-[16px] outline-none transition-all duration-300 focus:border-accent/50 focus:shadow-glow placeholder-ink/10"
          />
          {error && <p className="text-red-400 text-sm mt-3 text-center font-light">{error}</p>}
        </div>

        <button
          onClick={handleVerify}
          disabled={code.length !== 6 || loading}
          className="w-full pill-button-primary text-base disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {loading ? t.processing + "..." : "Verify & Start"}
        </button>
      </div>
    </div>
  );
}