import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { getOwner } from "../db/database";

export default function OTPLogin() {
  const navigate = useNavigate();
  const { role } = useParams();
  const { t } = useLanguage();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState("email");
  const inputRefs = useRef([]);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sendStatus, setSendStatus] = useState("");
  const [syncUrl, setSyncUrl] = useState(() => { try { return localStorage.getItem("cng_sync_url") || ""; } catch { return ""; } });

  useEffect(() => {
    if (syncUrl && !window.API_URL) window.API_URL = syncUrl.replace(/\/+$/, "");
  }, []);

  const isOwner = role === "owner";

  useEffect(() => {
    if (role === "driver") navigate("/driver-link", { replace: true });
  }, [role]);

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const [localOtp, setLocalOtp] = useState("");

  const handleSendOTP = () => {
    if (!isValidEmail(email)) return;
    const generated = Math.floor(100000 + Math.random() * 900000).toString();
    setLocalOtp(generated);
    setSendStatus(`OTP: ${generated}`);
    setOtpSent(true);
    setStep("otp");
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
    // Best-effort: also notify server (ignored if it fails)
    try { fetch((window.API_URL || "").replace(/\/+$/, "") + "/api/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => {}); } catch {}
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(0, 1);
    if (value && isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  };

  const handleVerify = async () => {
    if (otp.join("").length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const enteredOtp = otp.join("");

      // If we have a local OTP and it matches, skip server verification
      if (localOtp && enteredOtp === localOtp) {
        const userData = { name: email.split("@")[0], email, phone: "" };
        await login(userData, "owner");
        const existingOwner = getOwner();
        navigate(existingOwner ? "/dashboard" : "/register");
        setLoading(false);
        return;
      }

      const base = (window.API_URL || "").replace(/\/+$/, "");
      const res = await fetch(base + "/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: enteredOtp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invalid OTP"); setLoading(false); return; }

      // If backend returned owner data, restore it to localStorage
      const { owner: remoteOwner, syncData } = data;
      if (isOwner && remoteOwner) {
        try {
          localStorage.setItem("cng_owner", JSON.stringify(remoteOwner));
          if (syncData?.vehicles) localStorage.setItem("cng_vehicles", JSON.stringify(syncData.vehicles));
          if (syncData?.drivers) localStorage.setItem("cng_drivers", JSON.stringify(syncData.drivers));
          if (syncData?.fills) localStorage.setItem("cng_fills", JSON.stringify(syncData.fills));
        } catch {}
      }

      const userData = { name: remoteOwner?.name || email.split("@")[0], email, phone: remoteOwner?.phone || "" };
      await login(userData, role);
      if (isOwner) {
        const existingOwner = getOwner();
        navigate(existingOwner ? "/dashboard" : "/register");
      } else {
        navigate("/driver-link");
      }
    } catch (e) {
      setError("Network error. Check server URL.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-[-30%] left-[-10%] w-[60%] h-[50%] bg-accent/5 rounded-full blur-[100px]" />

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        <button onClick={() => navigate("/")} className="text-silver-dark hover:text-ink mb-8 flex items-center gap-2 text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>

        <div className="flex flex-col items-center mb-8">
          <img src="/logo.jpg" alt="Logo" className="w-[200px] h-[200px] object-contain rounded-2xl mb-6" />
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full tracking-wider uppercase ${isOwner ? "bg-accent/20 text-accent" : "bg-black/5 text-silver-dark"}`}>
              {isOwner ? t.ownerLogin : t.driverLogin}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-ink text-center tracking-tight">Enter your email</h2>
          <p className="text-silver-dark text-sm mt-1 font-light">We'll send a verification code to your email</p>
        </div>

        {step === "email" ? (
          <div className="space-y-4">
            <div className="glass-card p-1 flex items-center">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@email.com"
                className="bg-transparent text-ink text-lg w-full outline-none placeholder-ink/20 py-4 px-5"
              />
            </div>
            <button
              onClick={handleSendOTP}
              disabled={!isValidEmail(email) || loading}
              className="w-full pill-button-primary text-base disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : t.sendOTP}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-silver-dark text-sm text-center font-light">OTP sent to {email}</p>
            {sendStatus && <p className="text-accent text-xs text-center font-light">{sendStatus}</p>}
            <div className="flex gap-3 justify-center">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-12 h-14 bg-black/5 border border-black/10 rounded-2xl text-ink text-xl font-bold text-center outline-none transition-all duration-300 focus:border-accent/50 focus:shadow-glow"
                />
              ))}
            </div>
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button
              onClick={handleVerify}
              disabled={otp.join("").length !== 6 || loading}
              className="w-full pill-button-primary text-base disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : t.verify}
            </button>
            <div className="flex gap-3 justify-center text-xs">
              <button onClick={() => setStep("email")} className="text-silver-dark hover:text-ink transition-colors">Change email</button>
              <span className="text-ink/20">·</span>
              <button onClick={handleSendOTP} disabled={loading} className="text-accent hover:text-accent-dark transition-colors disabled:opacity-30">Resend OTP</button>
            </div>
          </div>
        )}
        <div className="text-center mt-4">
          <button onClick={() => setShowUrlInput(!showUrlInput)} className="text-xs text-silver-dark hover:text-accent transition-colors underline underline-offset-2 decoration-dotted">
            {showUrlInput ? "Hide" : syncUrl ? "Server: ***" : "Set Server URL"}
          </button>
          {showUrlInput && (
            <div className="mt-3 glass-card p-3 flex gap-2 items-center">
              <input type="url" value={syncUrl} onChange={(e) => setSyncUrl(e.target.value)} placeholder="https://web-production-e466.up.railway.app" className="flex-1 bg-black/5 border border-black/10 rounded-xl px-3 py-2 text-xs text-ink outline-none placeholder:text-ink/20" />
              <button onClick={() => { const cleanUrl = (syncUrl || "").replace(/\/+$/, ""); localStorage.setItem("cng_sync_url", cleanUrl); window.API_URL = cleanUrl || undefined; setShowUrlInput(false); }} className="bg-accent text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-accent-dark transition-all whitespace-nowrap">Save</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
