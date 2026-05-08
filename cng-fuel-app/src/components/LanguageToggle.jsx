import { useLanguage } from "../contexts/LanguageContext";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "hi", label: "HI" },
  { code: "gu", label: "GU" },
];

export default function LanguageToggle({ className = "" }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`flex gap-1 bg-gray-100 rounded-lg p-1 ${className}`}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
            lang === l.code
              ? "bg-primary text-white shadow"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
