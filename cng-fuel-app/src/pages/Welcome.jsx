import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";

export default function Welcome() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [syncUrl, setSyncUrl] = useState(() => { try { return localStorage.getItem("cng_sync_url") || ""; } catch { return ""; } });

  useEffect(() => {
    if (syncUrl && !window.API_URL) window.API_URL = syncUrl;
  }, []);

  const languages = [
    { code: "en", label: "English" },
    { code: "hi", label: "Hindi" },
    { code: "gu", label: "Gujarati" },
  ];

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-start px-6 relative overflow-hidden pt-16">
      <div className="absolute top-[-40%] left-[-20%] w-[80%] h-[60%] bg-accent/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[50%] bg-mint/5 rounded-full blur-[100px]" />

      <div className="relative z-10 flex-1 flex flex-col items-center w-full max-w-xs animate-fade-in">
        <img src="/logo.jpg" alt="Logo" className="w-[200px] h-[200px] object-contain rounded-2xl mb-6" />
        <h1 className="text-2xl font-bold text-ink text-center mb-2 tracking-tight">{t.appName}</h1>
        <p className="text-silver-dark text-center mb-12 text-sm font-light leading-relaxed">{t.tagline}</p>

        <div className="w-full glass-card p-4 mb-8">
          <p className="text-silver-dark text-xs text-center uppercase tracking-[0.2em] font-medium mb-3">{t.language}</p>
          <div className="flex gap-2 justify-center">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  lang === l.code
                    ? "bg-accent text-white shadow-glow scale-105"
                    : "bg-black/5 text-silver-dark hover:bg-black/10 hover:text-ink"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate("/driver-link")}
          className="w-full pill-button-primary text-lg py-4 mb-6 shadow-glow"
        >
          {t.driverLogin}
        </button>

        <div className="flex gap-4 items-center justify-center">
          <button
            onClick={() => navigate("/login/owner")}
            className="text-ink/20 hover:text-ink/40 text-xs transition-colors tracking-wider"
          >
            Fleet Owner
          </button>
          <span className="text-ink/10 text-xs">·</span>
          <button
            onClick={() => navigate("/admin-login")}
            className="text-ink/20 hover:text-ink/40 text-xs transition-colors tracking-wider"
          >
            Admin
          </button>
        </div>

        <div className="mt-6 text-center">
          <button onClick={() => setShowUrlInput(!showUrlInput)} className="text-xs text-silver-dark hover:text-accent transition-colors underline underline-offset-2 decoration-dotted">
            {showUrlInput ? "Hide" : syncUrl ? "Server: ***" : "Set Server URL"}
          </button>
          {showUrlInput && (
            <div className="mt-3 glass-card p-3 flex gap-2 items-center">
              <input type="url" value={syncUrl} onChange={(e) => setSyncUrl(e.target.value)} placeholder="https://web-production-e466.up.railway.app" className="flex-1 bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-xs text-ink outline-none placeholder:text-ink/20" />
              <button onClick={() => { localStorage.setItem("cng_sync_url", syncUrl); window.API_URL = syncUrl || undefined; setShowUrlInput(false); }} className="bg-accent text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-accent-dark transition-all whitespace-nowrap">Save</button>
            </div>
          )}
        </div>

      </div>
      <p className="text-ink/10 text-xs pb-4 tracking-wide">TechInnovate Mobility</p>
    </div>
  );
}