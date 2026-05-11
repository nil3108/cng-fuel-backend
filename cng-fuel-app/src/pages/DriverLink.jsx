import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { getDriverByCode, getDrivers, getVehicles } from "../db/database";

export default function DriverLink() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { login, setDriverInfo } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [driver, setDriver] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehId, setSelectedVehId] = useState("");

  function safeSignal(ms) {
    try { return AbortSignal.timeout(ms); } catch {
      const c = new AbortController();
      setTimeout(() => c.abort(), ms);
      return c.signal;
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("cng_sync_url") || "";
    if (saved && !window.API_URL) window.API_URL = saved;
  }, []);

  async function findDriverOnBackend(driverCode) {
    try {
      const res = await fetch((window.API_URL || "") + "/api/sync/all", { signal: safeSignal(10000) });
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

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError("");

    let foundDriver = getDriverByCode(code);
    let allVehicles = getVehicles();

    if (!foundDriver) {
      const result = await findDriverOnBackend(code);
      if (result) {
        foundDriver = result.driver;
        // Store ownerPhone on the driver record for fill sync
        foundDriver.ownerPhone = result.allData?.owner?.phone || "";
        allVehicles = result.allData?.vehicles || [];
        // Store owner data on driver device so getOwner() resolves correctly for pushSync
        if (result.allData?.owner) {
          try { localStorage.setItem("cng_owner", JSON.stringify(result.allData.owner)); } catch {}
        }
        // Store owner's fills on driver device so future pushes include existing fills
        if (Array.isArray(result.allData?.fills) && result.allData.fills.length > 0) {
          try { localStorage.setItem("cng_fills", JSON.stringify(result.allData.fills)); } catch {}
        }
        if (foundDriver && !getDrivers().find((d) => String(d.driverCode) === String(code))) {
          const drivers = getDrivers();
          drivers.push(foundDriver);
          try { localStorage.setItem("cng_drivers", JSON.stringify(drivers)); } catch {}
        }
      }
    }

    if (!foundDriver) {
      setError("Invalid code. Please check with the fleet owner.");
      setLoading(false);
      return;
    }

    if (allVehicles.length === 0) {
      try {
        const res = await fetch((window.API_URL || "") + "/api/sync/all", { signal: safeSignal(10000) });
        if (res.ok) {
          const entries = await res.json();
          for (const entry of entries) {
            if (Array.isArray(entry.data?.vehicles) && entry.data.vehicles.length > 0) {
              allVehicles = entry.data.vehicles;
              break;
            }
          }
        }
      } catch {}
    }

    if (allVehicles.length === 0) {
      setError("No vehicles found for this account. Contact the fleet owner.");
      setLoading(false);
      return;
    }

    setDriver(foundDriver);
    setVehicles(allVehicles);
    setLoading(false);
  };

  const handleSelectVehicle = async () => {
    if (!selectedVehId || !driver) return;
    setLoading(true);

    const vehicle = vehicles.find((v) => v.id === selectedVehId);
    if (!vehicle) { setError("Selected vehicle not found."); setLoading(false); return; }

    try {
      const existing = JSON.parse(localStorage.getItem("cng_vehicles") || "[]");
      const idx = existing.findIndex((v) => v.id === vehicle.id);
      if (idx >= 0) existing[idx] = { ...existing[idx], ...vehicle };
      else existing.push(vehicle);
      localStorage.setItem("cng_vehicles", JSON.stringify(existing));
    } catch {}

    await login({ name: driver.name, phone: driver.phone || "" }, "driver");

    setDriverInfo({
      driverId: driver.id,
      driverName: driver.name,
      vehicleId: vehicle.id,
      regNo: vehicle.regNo,
      strictMode: vehicle.strictMode || false,
      ownerPhone: driver.ownerPhone || vehicle.ownerPhone || "",
    });

    navigate("/fill");
  };

  if (driver) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-[60%] h-[50%] bg-accent/5 rounded-full blur-[100px]" />
        <div className="w-full max-w-sm relative z-10 animate-fade-in">
          <button onClick={() => { setDriver(null); setCode(""); setError(""); }} className="text-silver-dark hover:text-ink mb-8 flex items-center gap-2 text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>

          <div className="flex flex-col items-center mb-8">
            <img src="/logo.jpg" alt="Logo" className="w-[200px] h-[200px] object-contain rounded-2xl mb-6" />
            <h2 className="text-2xl font-bold text-ink text-center tracking-tight">Select Vehicle</h2>
            <p className="text-silver-dark text-sm mt-1 font-light">Which vehicle are you filling today, {driver.name}?</p>
          </div>

          <div className="space-y-3 mb-6">
            {vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVehId(v.id)}
                className={`w-full text-left px-5 py-4 rounded-2xl text-sm font-medium transition-all duration-300 ${
                  selectedVehId === v.id
                    ? "bg-accent/20 text-accent border-2 border-accent/30"
                    : "bg-black/5 text-ink border-2 border-transparent hover:bg-black/10"
                }`}
              >
                <p className="font-bold text-base">{v.regNo}</p>
                <p className="text-xs text-silver-dark mt-0.5">{v.make} {v.model}</p>
              </button>
            ))}
          </div>

          <button
            onClick={handleSelectVehicle}
            disabled={!selectedVehId || loading}
            className="w-full pill-button-primary text-base disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? "Starting..." : "Start Filling"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[60%] bg-accent/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[50%] bg-mint/5 rounded-full blur-[100px]" />

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
          {loading ? "Verifying..." : "Verify & Select Vehicle"}
        </button>
      </div>
    </div>
  );
}
