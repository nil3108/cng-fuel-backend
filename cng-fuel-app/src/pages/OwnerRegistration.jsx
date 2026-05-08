import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { getOwner, setOwner, getVehicles } from "../db/database";

export default function OwnerRegistration() {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
    setOwner(form);
    const vehicles = getVehicles();
    navigate(vehicles.length > 0 ? "/dashboard" : "/add-vehicle");
  };

  return (
    <div className="min-h-screen bg-brand-bg px-4 py-8">
      <div className="max-w-sm mx-auto">
        <button onClick={() => navigate("/login/owner")} className="text-primary/60 mb-6 flex items-center gap-1 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">1</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary">{t.fullName}</h2>
            <p className="text-gray-500 text-xs">Owner Registration</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <InputField label={t.fullName} value={form.fullName} onChange={(v) => handleChange("fullName", v)} placeholder="Enter your name" />
          <InputField label={t.businessName} value={form.businessName} onChange={(v) => handleChange("businessName", v)} placeholder="Business name" optional />
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t.city}</label>
            <select value={form.city} onChange={(e) => handleChange("city", e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-primary">
              <option>Vadodara</option>
              <option>Ahmedabad</option>
              <option>Surat</option>
            </select>
          </div>
          <InputField label={t.aadhaar} value={form.aadhaar} onChange={(v) => handleChange("aadhaar", v)} placeholder="12-digit Aadhaar" maxLength={12} type="number" />
          <InputField label={t.upiId} value={form.upiId} onChange={(v) => handleChange("upiId", v)} placeholder="username@upi" />
        </div>

        <button onClick={handleContinue} disabled={!isComplete} className="w-full bg-primary disabled:bg-gray-300 text-white font-bold py-3.5 rounded-xl text-lg mt-6 transition-all disabled:text-gray-500">
          {t.continue}
        </button>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, maxLength, type = "text", optional }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label} {optional && <span className="text-gray-400 font-normal">(Optional)</span>}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-primary transition-colors" />
    </div>
  );
}
