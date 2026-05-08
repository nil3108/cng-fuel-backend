import { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import BottomNav from "../components/BottomNav";
import { getVehicles, getFills } from "../db/database";

const CONVENIENCE_FEE_RATE = 0.02;

export default function Payment() {
  const { t } = useLanguage();
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const vehicles = getVehicles();
  const fills = getFills();
  const outstandingByVehicle = vehicles.map((v) => {
    const vehicleFills = fills.filter((f) => f.vehicleId === v.id);
    const weekFills = vehicleFills.filter((f) => f.date >= "2026-04-28");
    const total = weekFills.reduce((s, f) => s + f.rs, 0);
    return { regNo: v.regNo, amount: total, driver: v.driver };
  });

  const subtotal = outstandingByVehicle.reduce((s, v) => s + v.amount, 0);
  const convenienceFee = Math.round(subtotal * CONVENIENCE_FEE_RATE);
  const totalPayable = subtotal + convenienceFee;

  const paymentHistory = [
    { date: "2026-04-25", amount: 6200, status: "paid", method: "UPI" },
    { date: "2026-04-18", amount: 5450, status: "paid", method: "UPI" },
    { date: "2026-04-11", amount: 7100, status: "paid", method: "UPI" },
  ];

  const handlePay = () => {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setPaid(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-brand-bg pb-20">
      <div className="bg-primary px-4 pt-6 pb-8 rounded-b-3xl shadow-lg">
        <h1 className="text-white text-2xl font-bold mb-1">{t.payment}</h1>
        <p className="text-white/60 text-sm">{t.outstanding}</p>
      </div>

      <div className="px-4 -mt-4">
        {paid ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-bold text-gray-800">{t.paymentSuccess}</p>
            <p className="text-sm text-gray-500 mt-1">Rs {totalPayable.toLocaleString()} paid via UPI</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Breakdown</p>
            <div className="space-y-3 mb-4">
              {outstandingByVehicle.map((v) => (
                <div key={v.regNo} className="flex justify-between items-center py-1">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{v.regNo}</p>
                    <p className="text-xs text-gray-400">{v.driver}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-800">Rs {v.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">Rs {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t.convenienceFee} (2%)</span>
                <span className="font-medium">Rs {convenienceFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-1.5 border-t border-gray-100">
                <span>{t.totalPayable}</span>
                <span className="text-primary">Rs {totalPayable.toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full bg-accent text-white font-bold py-3.5 rounded-xl text-lg mt-4 shadow-lg disabled:opacity-70"
            >
              {paying ? t.processing + "..." : t.payNow}
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">{t.paymentHistory}</p>
          <div className="space-y-3">
            {paymentHistory.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.date}</p>
                  <p className="text-xs text-gray-400">{p.method}</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-800">Rs {p.amount.toLocaleString()}</p>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-medium">{t.paid}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
