import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";

export default function TermsDeposit() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="min-h-screen bg-primary px-6 py-8 relative">
      <div className="max-w-sm mx-auto animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center">
            <span className="text-accent text-sm font-bold">4</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-ink tracking-tight">{t.termsDeposit}</h2>
            <p className="text-silver-dark text-xs font-light">Complete registration</p>
          </div>
        </div>

        <div className="floating-card p-6 space-y-5 mb-8">
          <div className="space-y-3">
            <h3 className="text-ink font-semibold tracking-wide">{t.agreement}</h3>
            <ul className="space-y-2 text-sm text-silver-dark font-light leading-relaxed">
              <li className="flex gap-3">
                <span className="text-accent shrink-0 mt-1">•</span>
                <span>{t.term1}</span>
              </li>
              <li className="flex gap-3">
                <span className="text-accent shrink-0 mt-1">•</span>
                <span>{t.term2}</span>
              </li>
              <li className="flex gap-3">
                <span className="text-accent shrink-0 mt-1">•</span>
                <span>{t.term3}</span>
              </li>
            </ul>
          </div>

          <div className="bg-black/5 rounded-2xl p-5">
            <p className="text-silver-dark text-sm mb-1 font-light">{t.refundableDeposit}</p>
            <p className="text-3xl font-extrabold text-ink tracking-tight">Rs 3,500</p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 w-5 h-5 rounded-lg accent-accent" />
            <span className="text-sm text-silver-dark font-light leading-relaxed">{t.agreeTerms}</span>
          </label>
        </div>

        <button onClick={() => {}} disabled={!agreed} className="w-full pill-button-primary text-base disabled:opacity-30 disabled:cursor-not-allowed mb-3">
          {t.payDeposit} — Rs 3,500
        </button>
        <button onClick={() => navigate("/dashboard")} className="w-full pill-button-secondary text-base">
          {t.skipPay}
        </button>
      </div>
    </div>
  );
}