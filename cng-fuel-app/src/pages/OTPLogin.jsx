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

  const handleVerify = () => {
    if (otp.join("").length !== 6) return;
    const userData = { name: isOwner ? "Rajesh Patel" : "Vikram Singh", phone };
    login(userData, role);
    if (isOwner) {
      const existingOwner = getOwner();
      navigate(existingOwner ? "/dashboard" : "/register");
    } else {
      navigate("/driver-link");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <button onClick={() => navigate("/")} className="text-white/60 mb-8 flex items-center gap-1 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <img src="/logo.jpg" alt="Logo" className="w-14 h-14 object-contain mb-4 mx-auto" />

        <div className="flex items-center gap-2 mb-4 justify-center">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isOwner ? "bg-accent text-white" : "bg-white/20 text-white"}`}>
            {isOwner ? t.ownerLogin : t.driverLogin}
          </span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-1 text-center">{t.enterMobile}</h2>
        <p className="text-white/60 text-sm mb-8">We'll send a verification code</p>

        {step === "phone" ? (
          <>
            <div className="flex items-center bg-white/10 rounded-xl px-4 py-3 mb-4">
              <span className="text-white/70 font-medium mr-2">+91</span>
              <input
                type="number"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.slice(0, 10))}
                placeholder={t.mobilePlaceholder}
                className="bg-transparent text-white text-lg w-full outline-none placeholder-white/40"
              />
            </div>
            <button
              onClick={handleSendOTP}
              disabled={phone.length !== 10}
              className="w-full bg-accent disabled:bg-gray-500 text-white font-bold py-3.5 rounded-xl text-lg transition-all disabled:opacity-50"
            >
              {t.sendOTP}
            </button>
          </>
        ) : (
          <>
            <p className="text-white/70 text-sm mb-6 text-center">{t.otpSent}</p>
            <div className="flex gap-2 justify-center mb-6">
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
                  className="w-12 h-14 bg-white/10 border border-white/20 rounded-xl text-white text-xl font-bold text-center outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                />
              ))}
            </div>
            <button
              onClick={handleVerify}
              disabled={otp.join("").length !== 6}
              className="w-full bg-accent disabled:bg-gray-500 text-white font-bold py-3.5 rounded-xl text-lg transition-all disabled:opacity-50"
            >
              {t.verify}
            </button>
            <button onClick={() => setStep("phone")} className="w-full text-white/50 text-sm mt-4 hover:text-white/70">
              Change mobile number
            </button>
          </>
        )}
      </div>
    </div>
  );
}
