import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { getOwner, getFills } from "../db/database";

export default function Payment() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const owner = getOwner();
  const fills = getFills();

  const totalDue = fills.reduce((s, f) => s + (f.rs || 0), 0);
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePay = () => setShowSuccess(true);

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[60%] bg-mint/5 rounded-full blur-[120px]" />
        <div className="relative z-10 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-mint/20 flex items-center justify-center mx-auto mb-6 shadow-glow-mint">
            <svg className="w-10 h-10 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-ink mb-2 tracking-tight">{t.paymentSuccess}</h2>
          <p className="text-silver-dark text-sm mb-8 font-light">UPI payment completed</p>
          <button onClick={() => navigate("/dashboard")} className="pill-button-primary text-base">{t.goToDashboard}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary px-6 py-8 relative">
      <div className="max-w-sm mx-auto animate-fade-in">
        <button onClick={() => navigate("/dashboard")} className="text-silver-dark hover:text-ink mb-6 flex items-center gap-2 text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>

        <div className="floating-card p-6 mb-6 text-center">
          <p className="text-silver-dark text-xs uppercase tracking-[0.2em] font-medium mb-2">{t.totalDue}</p>
          <p className="text-4xl font-extrabold text-ink tracking-tight">Rs {totalDue.toLocaleString()}</p>
        </div>

        <div className="floating-card p-6 mb-6">
          <p className="text-sm font-semibold text-ink/70 mb-4 tracking-wide">{t.upiPayment}</p>
          <div className="bg-black/5 rounded-2xl p-5 text-center mb-4">
            <p className="text-silver-dark text-xs mb-2 font-medium">UPI ID</p>
            <p className="text-lg font-bold text-ink">{owner?.upiId || "owner@upi"}</p>
          </div>
          <button onClick={handlePay} className="w-full pill-button-primary text-base">Pay Rs {totalDue.toLocaleString()}</button>
        </div>

        <div className="floating-card p-5">
          <p className="text-sm font-semibold text-ink/70 mb-3 tracking-wide">{t.recentBills}</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {fills.slice(0, 10).map((f) => (
              <div key={f.id} className="flex justify-between items-center py-2 border-b border-black/5 last:border-0 text-sm">
                <div>
                  <p className="text-ink font-medium">{f.regNo}</p>
                  <p className="text-silver-dark text-xs font-light">{f.date}</p>
                </div>
                <p className="text-ink font-semibold">Rs {f.rs}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}