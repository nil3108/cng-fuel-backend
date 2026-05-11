import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOwner, setOwner } from "../db/database";
import { pushSync } from "../db/sync";

export default function Settings() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const existing = getOwner();
  const [form, setForm] = useState({
    firstName: existing?.firstName || "",
    middleName: existing?.middleName || "",
    lastName: existing?.lastName || "",
    email: existing?.email || "",
    phone: existing?.phone || "",
    businessName: existing?.businessName || "",
    city: existing?.city || "Vadodara",
    aadhaar: existing?.aadhaar || "",
    upiId: existing?.upiId || "",
  });

  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ");
      const phone = form.phone || existing?.phone || "";
      setOwner({ ...form, fullName, phone });
      if (phone) await pushSync(phone);
      setSaved(true);
      setTimeout(() => navigate("/dashboard"), 1000);
    } catch (e) {
      setError("Failed to sync. Saved locally.");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-primary px-6 py-8 relative">
      <div className="max-w-sm mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate("/dashboard")} className="text-silver-dark hover:text-ink flex items-center gap-2 text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          {saved && <span className="text-mint text-xs font-semibold">Saved!</span>}
          {error && <span className="text-yellow-400 text-xs font-semibold">{error}</span>}
        </div>

        <h2 className="text-2xl font-bold text-ink tracking-tight mb-1">Settings</h2>
        <p className="text-silver-dark text-xs mb-6 font-light">Update your personal details</p>

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
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">Phone <span className="text-ink/20 font-normal">(for data sync)</span></label>
            <div className="flex items-center input-field p-0 overflow-hidden">
              <span className="text-silver-dark font-medium pl-5 pr-2">+91</span>
              <input type="number" maxLength={10} value={form.phone} onChange={(e) => handleChange("phone", e.target.value.slice(0, 10))} placeholder="9876543210" className="bg-transparent text-ink w-full outline-none placeholder-ink/20 py-4 pr-5" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">Business Name <span className="text-ink/20 font-normal">(Optional)</span></label>
            <input type="text" value={form.businessName} onChange={(e) => handleChange("businessName", e.target.value)} placeholder="Business name" className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">City</label>
            <select value={form.city} onChange={(e) => handleChange("city", e.target.value)} className="input-field appearance-none">
              <option className="bg-primary">Vadodara</option>
              <option className="bg-primary">Ahmedabad</option>
              <option className="bg-primary">Surat</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">Aadhaar</label>
            <input type="number" maxLength={12} value={form.aadhaar} onChange={(e) => handleChange("aadhaar", e.target.value)} placeholder="12-digit Aadhaar" className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70 mb-2 block tracking-wide">UPI ID</label>
            <input type="text" value={form.upiId} onChange={(e) => handleChange("upiId", e.target.value)} placeholder="username@upi" className="input-field" />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="w-full pill-button-primary text-base mt-8 disabled:opacity-30 disabled:cursor-not-allowed">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
