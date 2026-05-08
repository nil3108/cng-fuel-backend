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
    <div className="min-h-screen bg-primary flex flex-col items-center justify-start px-6 relative overflow-hidden pt-16">
      <div className="absolute top-[-40%] left-[-20%] w-[80%] h-[60%] bg-accent/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[50%] bg-mint/5 rounded-full blur-[100px]" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-xs animate-fade-in">
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
          onClick={() => navigate("/login/owner")}
          className="w-full pill-button-primary text-base mb-3"
        >
          {t.ownerLogin}
        </button>
        <button
          onClick={() => navigate("/login/driver")}
          className="w-full pill-button-secondary text-base"
        >
          {t.driverLogin}
        </button>

        <button
          onClick={() => navigate("/admin-login")}
          className="text-ink/20 hover:text-ink/40 text-xs mt-10 transition-colors tracking-wider uppercase"
        >
          Admin Panel
        </button>
        <p className="text-ink/10 text-xs mt-2 tracking-wide">TechInnovate Mobility</p>
      </div>
    </div>
  );
}