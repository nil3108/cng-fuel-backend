import { useLanguage } from "../contexts/LanguageContext";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "hi", label: "HI" },
  { code: "gu", label: "GU" },
];

export default function LanguageToggle({ className = "" }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`flex gap-1 bg-black/5 rounded-xl p-1 ${className}`}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
            lang === l.code
              ? "bg-accent text-white shadow-glow"
              : "text-ink/40 hover:text-ink/70"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}