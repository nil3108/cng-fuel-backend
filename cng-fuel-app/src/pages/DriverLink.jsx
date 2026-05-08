import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { getDriverByCode, getVehicle } from "../db/database";

export default function DriverLink() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { setDriverInfo } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError("");

    setTimeout(() => {
      const driver = getDriverByCode(code);
      if (!driver) {
        setError("Invalid code. Please check with the fleet owner.");
        setLoading(false);
        return;
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
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <button onClick={() => navigate("/")} className="text-white/60 mb-8 flex items-center gap-1 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <img src="/logo.jpg" alt="Logo" className="w-14 h-14 object-contain mb-4 mx-auto" />

        <h2 className="text-2xl font-bold text-white mb-1 text-center">Enter Driver Code</h2>
        <p className="text-white/60 text-sm mb-8">Ask the fleet owner for your 6-digit code</p>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-4">
          <label className="text-white/70 text-sm font-medium mb-2 block">6-Digit Code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
            placeholder="000000"
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-4 text-white text-3xl font-bold text-center tracking-[12px] outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all placeholder-white/20"
          />
          {error && <p className="text-red-300 text-sm mt-2 text-center">{error}</p>}
        </div>

        <button
          onClick={handleVerify}
          disabled={code.length !== 6 || loading}
          className="w-full bg-accent disabled:bg-gray-500 text-white font-bold py-3.5 rounded-xl text-lg transition-all disabled:opacity-50"
        >
          {loading ? t.processing + "..." : "Verify & Start"}
        </button>
      </div>
    </div>
  );
}
