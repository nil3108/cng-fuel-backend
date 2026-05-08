import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";

export default function Welcome() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();

  const languages = [
    { code: "en", label: "English" },
    { code: "hi", label: "Hindi" },
    { code: "gu", label: "Gujarati" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark flex flex-col items-center justify-center px-6">
      <img src="/logo.jpg" alt="Logo" className="w-24 h-24 object-contain mb-6" />
      <h1 className="text-2xl font-bold text-white text-center mb-2">{t.appName}</h1>
      <p className="text-white/80 text-center mb-10 text-sm">{t.tagline}</p>

      <div className="flex flex-col gap-3 w-full max-w-xs mb-8">
        <p className="text-white/70 text-xs text-center uppercase tracking-wider font-medium">{t.language}</p>
        <div className="flex gap-2 justify-center">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                lang === l.code
                  ? "bg-accent text-white shadow-lg scale-105"
                  : "bg-white/20 text-white/80 hover:bg-white/30"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => navigate("/login/owner")}
        className="w-full max-w-xs bg-accent hover:bg-accent-dark text-white font-bold py-3.5 rounded-xl text-lg transition-all shadow-lg hover:shadow-xl active:scale-[0.98] mb-3"
      >
        {t.ownerLogin}
      </button>
      <button
        onClick={() => navigate("/login/driver")}
        className="w-full max-w-xs bg-white/20 hover:bg-white/30 text-white font-bold py-3.5 rounded-xl text-lg transition-all active:scale-[0.98]"
      >
        {t.driverLogin}
      </button>

      <button
        onClick={() => navigate("/admin-login")}
        className="text-white/30 hover:text-white/60 text-xs mt-8 transition-colors"
      >
        Admin Panel
      </button>
      <p className="text-white/40 text-xs mt-1">TechInnovate Mobility</p>
    </div>
  );
}
