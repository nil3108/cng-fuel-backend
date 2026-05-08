import { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { getOwner } from "../db/database";

export default function OTPLogin() {
  const navigate = useNavigate();
  const { role } = useParams();
  const { t } = useLanguage();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState("phone");
  const inputRefs = useRef([]);

  const isOwner = role === "owner";

  const handleSendOTP = () => {
    if (phone.length !== 10) return;
    setOtpSent(true);
    setStep("otp");
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
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
    const userData = { name: isOwner ? "Rajesh Patel" : "Vikram Singh", phone };
    await login(userData, role);
    if (isOwner) {
      const existingOwner = getOwner();
      navigate(existingOwner ? "/dashboard" : "/register");
    } else {
      navigate("/driver-link");
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
          <h2 className="text-2xl font-bold text-ink text-center tracking-tight">{t.enterMobile}</h2>
          <p className="text-silver-dark text-sm mt-1 font-light">We'll send a verification code</p>
        </div>

        {step === "phone" ? (
          <div className="space-y-4">
            <div className="glass-card p-1 flex items-center">
              <span className="text-silver-dark font-medium pl-5 pr-2">+91</span>
              <input
                type="number"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.slice(0, 10))}
                placeholder={t.mobilePlaceholder}
                className="bg-transparent text-ink text-lg w-full outline-none placeholder-ink/20 py-4 pr-5"
              />
            </div>
            <button
              onClick={handleSendOTP}
              disabled={phone.length !== 10}
              className="w-full pill-button-primary text-base disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {t.sendOTP}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-silver-dark text-sm text-center font-light">{t.otpSent}</p>
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
            <button
              onClick={handleVerify}
              disabled={otp.join("").length !== 6}
              className="w-full pill-button-primary text-base disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {t.verify}
            </button>
            <button onClick={() => setStep("phone")} className="w-full text-silver-dark text-sm hover:text-ink transition-colors text-center">
              Change mobile number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}