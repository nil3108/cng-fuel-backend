import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { getVehicles, addDriver } from "../db/database";

export default function AddDriver() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const skipTerms = searchParams.get("skipTerms") === "true";
  const vehicles = getVehicles();
  const [form, setForm] = useState({ name: "", mobile: "", license: "", vehicleId: vehicles[0]?.id || "" });
  const [savedCode, setSavedCode] = useState(null);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const isComplete = form.name && form.mobile.length === 10 && form.license && form.vehicleId;

  const handleAdd = () => {
    const { id, driverCode } = addDriver(form);
    setSavedCode(driverCode);
  };

  if (savedCode) {
    return (
      <div className="min-h-screen bg-brand-bg px-4 py-8">
        <div className="max-w-sm mx-auto text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-primary mb-2">Driver Added!</h2>
          <p className="text-gray-500 text-sm mb-6">Share this code with the driver to link them to the vehicle.</p>

          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Driver Code</p>
            <p className="text-4xl font-extrabold text-accent tracking-[8px] select-all">{savedCode}</p>
          </div>

          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 mb-6 text-left">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-yellow-800">The driver must enter this code after logging in. They will be linked to <strong>{vehicles.find((v) => v.id === form.vehicleId)?.regNo}</strong>.</p>
            </div>
          </div>

          <button onClick={() => navigate(skipTerms ? "/dashboard" : "/terms")} className="w-full bg-primary text-white font-bold py-3.5 rounded-xl text-lg">
            {t.continue}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg px-4 py-8">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"><span className="text-white text-xs font-bold">3</span></div>
          <div><h2 className="text-xl font-bold text-primary">{t.addDriver}</h2><p className="text-gray-500 text-xs">Assign a driver to vehicle</p></div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <InputField label={t.driverName} value={form.name} onChange={(v) => handleChange("name", v)} placeholder="Driver's full name" />
          <InputField label={t.driverMobile} value={form.mobile} onChange={(v) => handleChange("mobile", v)} placeholder="10-digit mobile" type="number" maxLength={10} />
          <InputField label={t.licenseNumber} value={form.license} onChange={(v) => handleChange("license", v)} placeholder="License number" />
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t.assignVehicle}</label>
            <select value={form.vehicleId} onChange={(e) => handleChange("vehicleId", e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-primary">
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.regNo}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={() => navigate(skipTerms ? "/dashboard" : "/terms")} className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3.5 rounded-xl text-base transition-all hover:bg-gray-300">{t.skip}</button>
          <button onClick={handleAdd} disabled={!isComplete} className="flex-1 bg-primary disabled:bg-gray-300 text-white font-bold py-3.5 rounded-xl text-base transition-all disabled:text-gray-500">{t.addDriverBtn}</button>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, maxLength, type = "text" }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-primary transition-colors" />
    </div>
  );
}
