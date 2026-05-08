import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { getOwner, setOwner, getVehicles } from "../db/database";

export default function OwnerRegistration() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [form, setForm] = useState({ fullName: "", businessName: "", city: "Vadodara", aadhaar: "", upiId: "" });

  useEffect(() => {
    const existing = getOwner();
    if (existing) {
      setForm({ fullName: existing.fullName || "", businessName: existing.businessName || "", city: existing.city || "Vadodara", aadhaar: existing.aadhaar || "", upiId: existing.upiId || "" });
    }
  }, []);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const isComplete = form.fullName && form.aadhaar.length === 12 && form.upiId;

  const handleContinue = () => {
    setOwner({ ...form, phone: user?.phone || "" });
    const vehicles = getVehicles();
    navigate(vehicles.length > 0 ? "/dashboard" : "/add-vehicle");
  };

  return (
    <div className="min-h-screen bg-primary px-6 py-8 relative">
      <div className="max-w-sm mx-auto animate-fade-in">
        <button onClick={() => navigate("/login/owner")} className="text-silver-dark hover:text-ink mb-6 flex items-center gap-2 text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center">
            <span className="text-accent text-sm font-bold">1</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-ink tracking-tight">{t.fullName}</h2>
            <p className="text-silver-dark text-xs font-light">Owner Registration</p>
          </div>
        </div>

        <div className="floating-card p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">{t.fullName}</label>
            <input type="text" value={form.fullName} onChange={(e) => handleChange("fullName", e.target.value)} placeholder="Enter your name" className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">{t.businessName} <span className="text-ink/20 font-normal">(Optional)</span></label>
            <input type="text" value={form.businessName} onChange={(e) => handleChange("businessName", e.target.value)} placeholder="Business name" className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">{t.city}</label>
            <select value={form.city} onChange={(e) => handleChange("city", e.target.value)} className="input-field appearance-none">
              <option className="bg-primary">Vadodara</option>
              <option className="bg-primary">Ahmedabad</option>
              <option className="bg-primary">Surat</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">{t.aadhaar}</label>
            <input type="number" maxLength={12} value={form.aadhaar} onChange={(e) => handleChange("aadhaar", e.target.value)} placeholder="12-digit Aadhaar" className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">{t.upiId}</label>
            <input type="text" value={form.upiId} onChange={(e) => handleChange("upiId", e.target.value)} placeholder="username@upi" className="input-field" />
          </div>
        </div>

        <button onClick={handleContinue} disabled={!isComplete} className="w-full pill-button-primary text-base mt-8 disabled:opacity-30 disabled:cursor-not-allowed">
          {t.continue}
        </button>
      </div>
    </div>
  );
}