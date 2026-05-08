import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { addVehicle } from "../db/database";

export default function AddVehicle() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [form, setForm] = useState({ regNo: "", make: "", model: "", fuelType: "CNG", regDate: "", insuranceExpiry: "" });

  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));
  const isComplete = form.regNo && form.make && form.model;

  const handleSave = () => {
    addVehicle(form);
    navigate("/add-driver");
  };

  return (
    <div className="min-h-screen bg-primary px-6 py-8 relative">
      <div className="max-w-sm mx-auto animate-fade-in">
        <button onClick={() => navigate("/register")} className="text-silver-dark hover:text-ink mb-6 flex items-center gap-2 text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center">
            <span className="text-accent text-sm font-bold">2</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-ink tracking-tight">{t.addVehicle}</h2>
            <p className="text-silver-dark text-xs font-light">Vehicle details</p>
          </div>
        </div>

        <div className="floating-card p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">{t.registrationNo}</label>
            <input type="text" value={form.regNo} onChange={(e) => handleChange("regNo", e.target.value.toUpperCase())} placeholder="GJ-00-XX-0000" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">{t.brand}</label>
              <input type="text" value={form.make} onChange={(e) => handleChange("make", e.target.value)} placeholder="Tata" className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">{t.model}</label>
              <input type="text" value={form.model} onChange={(e) => handleChange("model", e.target.value)} placeholder="Ace CNG" className="input-field" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">{t.fuelType}</label>
            <div className="flex gap-3">
              {["CNG", "Petrol", "Diesel"].map((f) => (
                <button key={f} onClick={() => handleChange("fuelType", f)} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${form.fuelType === f ? "bg-accent text-white shadow-glow" : "bg-black/5 text-silver-dark hover:bg-black/10"}`}>{f}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">{t.regDate}</label>
            <input type="date" value={form.regDate} onChange={(e) => handleChange("regDate", e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">{t.insuranceExpiry}</label>
            <input type="date" value={form.insuranceExpiry} onChange={(e) => handleChange("insuranceExpiry", e.target.value)} className="input-field" />
          </div>
        </div>

        <button onClick={handleSave} disabled={!isComplete} className="w-full pill-button-primary text-base mt-8 disabled:opacity-30 disabled:cursor-not-allowed">
          {t.saveContinue}
        </button>
      </div>
    </div>
  );
}