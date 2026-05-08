import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";


export default function TermsDeposit() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [accepted, setAccepted] = useState(false);
  const DEPOSIT_AMOUNT = 3500;
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePay = () => {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setSuccess(true);
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{t.paymentSuccess}</h2>
        <p className="text-gray-600 text-center mb-8">{t.paymentSuccessMsg}</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full max-w-xs bg-primary text-white font-bold py-3.5 rounded-xl text-lg shadow-lg"
        >
          {t.goToDashboard}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg px-4 py-8">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">4</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary">{t.termsTitle}</h2>
            <p className="text-gray-500 text-xs">Deposit & Agreement</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <div className="h-48 overflow-y-auto text-sm text-gray-600 space-y-3 pr-2 custom-scroll">
            <p className="font-semibold text-gray-800">CNG Fuel Credit Service - Terms & Conditions</p>
            <p>1. The security deposit of Rs {DEPOSIT_AMOUNT.toLocaleString()} per vehicle is refundable upon termination of services, subject to deduction of any outstanding dues.</p>
            <p>2. Fuel credit will be provided up to a predefined limit based on the deposit amount and vehicle type.</p>
            <p>3. Payments must be made within the due date. Late payments may attract additional charges.</p>
            <p>4. The vehicle owner is responsible for ensuring the vehicle is CNG-compliant and all documents are valid.</p>
            <p>5. Any anomaly in fuel consumption will be reported to the owner. Repeated anomalies may lead to service suspension.</p>
            <p>6. The driver must upload CNG receipts and odometer readings for every fill.</p>
            <p>7. TechInnovate Mobility reserves the right to modify these terms with prior notice.</p>
            <p>8. In case of disputes, the jurisdiction shall be Vadodara, Gujarat.</p>
            <p>9. The convenience fee for payments is applicable as per the prevailing rate.</p>
            <p>10. By accepting these terms, you agree to the data collection and processing for service optimization.</p>
          </div>
        </div>

        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 w-5 h-5 rounded accent-primary"
          />
          <span className="text-sm text-gray-700">{t.acceptTerms}</span>
        </label>

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">{t.depositAmount}</span>
            <span className="text-xs text-gray-400">{t.depositDesc}</span>
          </div>
          <p className="text-3xl font-bold text-primary">Rs {DEPOSIT_AMOUNT.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Estimated (per vehicle)</p>
        </div>

        <button
          onClick={handlePay}
          disabled={!accepted || paying}
          className="w-full bg-accent disabled:bg-gray-300 text-white font-bold py-3.5 rounded-xl text-lg transition-all disabled:text-gray-500 shadow-lg"
        >
          {paying ? t.processing + "..." : t.payDeposit}
        </button>
      </div>
    </div>
  );
}
