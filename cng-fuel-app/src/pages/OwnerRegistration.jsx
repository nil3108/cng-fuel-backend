import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { getOwner, setOwner, getVehicles } from "../db/database";
import { pullSync } from "../db/sync";

export default function OwnerRegistration() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [form, setForm] = useState({ firstName: "", middleName: "", lastName: "", email: user?.email || "", businessName: "", phone: "", city: "Vadodara", aadhaar: "", upiId: "" });
  const [showRestore, setShowRestore] = useState(false);
  const [restoreUrl, setRestoreUrl] = useState(() => { try { return localStorage.getItem("cng_sync_url") || ""; } catch { return ""; } });
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState("");
  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    const existing = getOwner();
    if (existing) {
      setForm({ firstName: existing.firstName || "", middleName: existing.middleName || "", lastName: existing.lastName || "", email: existing.email || user?.email || "", businessName: existing.businessName || "", phone: existing.phone || "", city: existing.city || "Vadodara", aadhaar: existing.aadhaar || "", upiId: existing.upiId || "" });
    }
  }, []);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const isComplete = form.firstName && form.aadhaar.length === 12 && form.upiId;

  const handleContinue = () => {
    const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ");
    setOwner({ ...form, fullName, phone: form.phone || user?.phone || "" });
    const vehicles = getVehicles();
    navigate(vehicles.length > 0 ? "/dashboard" : "/add-vehicle");
  };

  const testConnection = async () => {
    if (!restoreUrl) { setDebugInfo("Enter a URL first"); return; }
    const cleanUrl = restoreUrl.trim().replace(/\/+$/, "");
    setDebugInfo("Testing: " + cleanUrl + "/api/health");
    try {
      const url = cleanUrl + "/api/health";
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const text = await res.text();
      setDebugInfo(`Status ${res.status}: ${text.slice(0, 200)}`);
    } catch (e) {
      setDebugInfo(`Failed: ${e.name} — ${e.message}\nURL: ${cleanUrl}/api/health`);
    }
  };

  const handleRestore = async () => {
    if (!restoreUrl) { setRestoreMsg("Enter the server URL first"); return; }
    setRestoring(true);
    setRestoreMsg("");
    setDebugInfo("");
    const cleanUrl = restoreUrl.trim().replace(/\/+$/, "");
    try {
      localStorage.setItem("cng_sync_url", cleanUrl);
      window.API_URL = cleanUrl;
      const phone = user?.phone || "";
      setDebugInfo(`Phone: ${phone}\nURL: ${cleanUrl}/api/sync/${phone}`);
      if (!phone) { setRestoreMsg("No phone number found. Please go back and login again."); setRestoring(false); return; }
      
      // Try direct API call for diagnostics
      try {
        const testUrl = cleanUrl + "/api/sync/" + phone;
        const testRes = await fetch(testUrl, { signal: AbortSignal.timeout(8000) });
        const testText = await testRes.json();
        setDebugInfo(prev => prev + `\nResponse ${testRes.status}: owner=${!!testText?.owner}, vehicles=${testText?.vehicles?.length || 0}`);
      } catch (e) {
        setDebugInfo(prev => prev + `\nFetch failed: ${e.name} — ${e.message}`);
      }

      const ok = await pullSync(phone);
      if (ok && getOwner()) {
        setRestoreMsg("Restored! Redirecting...");
        setTimeout(() => navigate("/dashboard"), 800);
      } else {
        setRestoreMsg("No backup found. Make sure you: 1) Started backend + ngrok on PC, 2) Synced from your OLD device first (localhost:5173 → Set Server URL → Sync)");
      }
    } catch (e) {
      setRestoreMsg("Failed: " + e.message);
    }
    setRestoring(false);
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
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">Name</label>
            <div className="flex gap-2">
              <input type="text" value={form.firstName} onChange={(e) => handleChange("firstName", e.target.value)} placeholder="First" className="input-field flex-1" />
              <input type="text" value={form.middleName} onChange={(e) => handleChange("middleName", e.target.value)} placeholder="Middle" className="input-field flex-1" />
              <input type="text" value={form.lastName} onChange={(e) => handleChange("lastName", e.target.value)} placeholder="Last" className="input-field flex-1" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">Email</label>
            <input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="owner@email.com" className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">{t.businessName} <span className="text-ink/20 font-normal">(Optional)</span></label>
            <input type="text" value={form.businessName} onChange={(e) => handleChange("businessName", e.target.value)} placeholder="Business name" className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">Phone <span className="text-ink/20 font-normal">(for data sync)</span></label>
            <div className="flex items-center input-field p-0 overflow-hidden">
              <span className="text-silver-dark font-medium pl-5 pr-2">+91</span>
              <input type="number" maxLength={10} value={form.phone} onChange={(e) => handleChange("phone", e.target.value.slice(0, 10))} placeholder="9876543210" className="bg-transparent text-ink w-full outline-none placeholder-ink/20 py-4 pr-5" />
            </div>
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

        {/* Restore from backup */}
        <div className="text-center mt-6">
          <button onClick={() => setShowRestore(!showRestore)} className="text-xs text-silver-dark hover:text-accent transition-colors underline underline-offset-2 decoration-dotted">
            {showRestore ? "Hide" : "Already have data? Restore from backup"}
          </button>
          {showRestore && (
            <div className="floating-card p-4 mt-3">
              <label className="text-silver-dark text-xs font-medium block mb-2 tracking-wide">Backend Server URL</label>
              <div className="flex gap-2">
                <input type="url" value={restoreUrl} onChange={(e) => setRestoreUrl(e.target.value)} placeholder="https://xxxx.ngrok.io" className="flex-1 bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-ink text-xs outline-none focus:border-accent/50" />
                <button onClick={testConnection} className="px-2 py-2 bg-black/5 text-ink text-xs rounded-xl hover:bg-black/10 transition-colors">Test</button>
                <button onClick={handleRestore} disabled={restoring} className="px-3 py-2 bg-accent text-white text-xs font-medium rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-30">{restoring ? "..." : "Restore"}</button>
              </div>
              {restoreMsg && <p className="text-xs mt-2 text-silver-dark">{restoreMsg}</p>}
              {debugInfo && <pre className="text-[10px] mt-2 text-silver-dark text-left whitespace-pre-wrap break-all bg-black/5 p-2 rounded-lg">{debugInfo}</pre>}
            </div>
          )}
        </div>

        <button onClick={handleContinue} disabled={!isComplete} className="w-full pill-button-primary text-base mt-8 disabled:opacity-30 disabled:cursor-not-allowed">
          {t.continue}
        </button>
      </div>
    </div>
  );
}