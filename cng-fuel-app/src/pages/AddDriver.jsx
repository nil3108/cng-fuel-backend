import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { addDriver, getDrivers } from "../db/database";

export default function AddDriver() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const existingDrivers = getDrivers();

  const [form, setForm] = useState({ name: "", phone: "" });
  const [newCode, setNewCode] = useState(null);

  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));
  const isComplete = form.name && form.phone.length >= 10;

  const handleAdd = () => {
    const result = addDriver(form);
    setNewCode(result.driverCode);
  };

  const handleFinish = () => {
    navigate("/dashboard");
  };

  if (newCode) {
    return (
      <div className="min-h-screen bg-primary px-6 py-8 flex items-center justify-center relative">
        <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[60%] bg-mint/5 rounded-full blur-[100px]" />
        <div className="max-w-sm w-full relative z-10 animate-fade-in">
          <div className="floating-card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-mint/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-ink mb-2 tracking-tight">{t.driverAdded}</h2>
            <p className="text-silver-dark text-sm mb-6 font-light">Share this code with the driver</p>
            <div className="bg-black/5 rounded-2xl py-5 px-4 mb-6">
              <p className="text-4xl font-extrabold tracking-[12px] text-accent font-mono">{newCode}</p>
            </div>
            <button onClick={handleFinish} className="w-full pill-button-primary text-base">
              {t.continue}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary px-6 py-8 relative">
      <div className="max-w-sm mx-auto animate-fade-in">
        <button onClick={() => navigate("/add-vehicle")} className="text-silver-dark hover:text-ink mb-6 flex items-center gap-2 text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center">
            <span className="text-accent text-sm font-bold">3</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-ink tracking-tight">{t.addDriver}</h2>
            <p className="text-silver-dark text-xs font-light">Create a driver code</p>
          </div>
        </div>

        {existingDrivers.length > 0 && (
          <div className="floating-card p-4 mb-6">
            <p className="text-sm font-semibold text-ink/70 mb-3 tracking-wide">Existing Drivers</p>
            {existingDrivers.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
                <p className="text-ink text-sm font-medium">{d.name}</p>
                <span className="font-mono text-accent text-sm font-bold tracking-widest">{d.driverCode}</span>
              </div>
            ))}
          </div>
        )}

        <div className="floating-card p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">{t.driverName}</label>
            <input type="text" value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Driver name" className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">{t.mobileNumber}</label>
            <div className="flex items-center input-field p-0 overflow-hidden">
              <span className="text-silver-dark font-medium pl-5 pr-2">+91</span>
              <input type="number" maxLength={10} value={form.phone} onChange={(e) => handleChange("phone", e.target.value.slice(0, 10))} placeholder="9876543210" className="bg-transparent text-ink w-full outline-none placeholder-ink/20 py-4 pr-5" />
            </div>
          </div>
        </div>

        <button onClick={handleAdd} disabled={!isComplete} className="w-full pill-button-primary text-base mt-8 disabled:opacity-30 disabled:cursor-not-allowed">
          {t.addDriver}
        </button>
      </div>
    </div>
  );
}
