import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import useGeolocation from "../hooks/useGeolocation";
import { haversineDistance } from "../utils/distance";
import { readFileAsDataURL, generatePhotoDataUri } from "../utils/photoPlaceholder";
import LocationMap from "../components/LocationMap";
import { addFill, getVehicle } from "../db/database";
import { pushSync, getSyncRetryStatus } from "../db/sync";
import Tesseract from "tesseract.js";

const BASE_STEPS = ["filling-video", "pump-meter", "receipt", "odometer"];
const LOCATION_THRESHOLD = 500;
const STATION_OPTIONS = ["Vadodara Gas Limited", "Gujarat Gas Limited", "Adani Gas"];

function CameraCapture({ onCapture, label, t, locating }) {
  const inputRef = useRef(null);
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <p className="text-ink font-semibold text-lg mb-2 tracking-tight">{label}</p>
      <p className="text-silver-dark text-xs mb-8 font-light">{t.cameraOnly}</p>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={locating}
        className="w-56 h-56 bg-black/5 border border-black/10 rounded-4xl flex flex-col items-center justify-center hover:bg-black/10 transition-all active:scale-[0.97] disabled:opacity-50"
      >
        {locating ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto mb-2" />
            <span className="text-accent text-sm font-semibold">Getting location...</span>
          </div>
        ) : (
          <div className="text-center">
            <svg className="w-20 h-20 text-ink/30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-ink/50 text-sm font-semibold">{t.openCamera}</span>
          </div>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { if (e.target.files[0]) onCapture(e.target.files[0]); e.target.value = ""; }} />
    </div>
  );
}

function ReviewFields({ fields, data, onChange }) {
  return (
    <div className="floating-card p-5 space-y-4">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="text-xs text-silver-dark font-medium tracking-wide">{f.label}</label>
          <input type="text" value={data[f.key] || ""} onChange={(e) => onChange(f.key, e.target.value)} className="input-field mt-1.5" />
        </div>
      ))}
    </div>
  );
}

function StepIndicator({ current, steps }) {
  const idx = steps.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-2 px-6 pt-6 pb-3">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
            i <= idx ? "bg-accent text-white shadow-glow" : "bg-black/5 text-silver-dark"
          }`}>{i + 1}</div>
          {i < steps.length - 1 && <div className={`w-8 h-0.5 rounded-full ${i < idx ? "bg-accent" : "bg-black/10"}`} />}
        </div>
      ))}
    </div>
  );
}

export default function CngFilled() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { role, driverInfo } = useAuth();
  const isDriver = role === "driver";
  const { requestLocation, permissionDenied } = useGeolocation();

  const regNo = driverInfo?.regNo || "Unknown";
  const vehicleId = driverInfo?.vehicleId || "";
  const driverName = driverInfo?.driverName || "";
  const vehicle = getVehicle(vehicleId);
  const STEPS = ["filling-video", "pump-meter", "receipt", "odometer"];

  const [step, setStep] = useState("start");
  const [locating, setLocating] = useState(false);
  const [pumpMeter, setPumpMeter] = useState({ kg: "", amount: "" });
  const [receipt, setReceipt] = useState({ kg: "", rate: "", amount: "", vehicleNo: "", date: "", time: "", station: "" });
  const [odometer, setOdometer] = useState("");
  const [saved, setSaved] = useState(false);
  const [syncRetryStatus, setSyncRetryStatus] = useState("");

  const [photos, setPhotos] = useState({ pumpMeter: null, fillingVideo: null, receipt: null, odometer: null });
  const [stationCoords, setStationCoords] = useState(null);
  const [stationTimestamp, setStationTimestamp] = useState(null);
  const [odometerCoords, setOdometerCoords] = useState(null);
  const [odometerTimestamp, setOdometerTimestamp] = useState(null);
  const [locationStatus, setLocationStatus] = useState("pending");
  const [mismatchWarning, setMismatchWarning] = useState(null);
  const [locationUnavailable, setLocationUnavailable] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrResult, setOcrResult] = useState("");
  const [ocrRunning2, setOcrRunning2] = useState(false);
  const [ocrResult2, setOcrResult2] = useState("");
  const [stationOption, setStationOption] = useState("");

  const resetForm = useCallback(() => {
    setStep("start"); setPumpMeter({ kg: "", amount: "" }); setReceipt({ kg: "", rate: "", amount: "", vehicleNo: "", date: "", time: "", station: "" });
    setOdometer(""); setSaved(false); setPhotos({ pumpMeter: null, fillingVideo: null, receipt: null, odometer: null });
    setStationCoords(null); setStationTimestamp(null); setOdometerCoords(null); setOdometerTimestamp(null);
    setLocationStatus("pending"); setMismatchWarning(null); setLocationUnavailable(false); setOcrRunning(false); setOcrResult(""); setOcrRunning2(false); setOcrResult2(""); setStationOption(""); setSyncRetryStatus("");
  }, []);

  const handleFillingVideoCapture = async (file) => {
    const dataUrl = await readFileAsDataURL(file);
    setPhotos((p) => ({ ...p, fillingVideo: dataUrl || "video-captured" }));
    setTimeout(() => setStep("pump-meter"), 500);
  };

  const handlePumpMeterCapture = async (file) => {
    const dataUrl = await readFileAsDataURL(file) || generatePhotoDataUri("pumpMeter");
    setPhotos((p) => ({ ...p, pumpMeter: dataUrl }));
    setStep("receipt");
  };

  const captureGps = async () => {
    setLocating(true);
    const coords = await requestLocation();
    setLocating(false);
    if (!coords) { setLocationUnavailable(true); return null; }
    return coords;
  };

  const handleReceiptCapture = async (file) => {
    const dataUrl = await readFileAsDataURL(file) || generatePhotoDataUri("receipt");
    setPhotos((p) => ({ ...p, receipt: dataUrl }));
    setLocating(true);
    const coords = await requestLocation();
    setLocating(false);
    if (coords) setStationCoords(coords);
    setStationTimestamp(new Date().toISOString());
    const now = new Date();
    setReceipt({ kg: "", rate: "", amount: "", vehicleNo: regNo,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
    });
    setStep("receipt-review");
    setOcrRunning2(true);
    setOcrResult2("");
    try {
      const { data } = await Tesseract.recognize(dataUrl, "eng", { logger: (m) => { if (m.status === "recognizing text") setOcrResult2(`Scanning receipt... ${Math.round(m.progress * 100)}%`); } });
      const text = data.text;
      const kgMatch = text.match(/(?:kg|QL|Qty)[\s:]*([\d.]+)/i) || text.match(/(\d+\.?\d*)\s*(?:kg|QL)/i);
      const amountMatch = text.match(/(?:₹|Rs|Amount|Total|PAY)[\s:]*([\d,]+)/i) || text.match(/([\d,]+)\s*(?:₹|Rs)/i);
      const rateMatch = text.match(/(?:Rate|PU|Unit)[\s:]*([\d,]+)/i) || text.match(/([\d,]+)\/kg/i);
      const stationMatch = text.match(/(?:Station|Outlet|Pump)[\s:]*([A-Za-z\s]+?)(?:\d|$)/i) || text.match(/^([A-Za-z][A-Za-z\s]{3,20})(?:,|\d)/m);
      const setReceiptData = (updates) => {
        setReceipt((prev) => {
          const next = { ...prev, ...updates };
          if (next.kg && !next.amount && next.rate) {
            const kgVal = parseFloat(next.kg);
            const rateVal = parseFloat(next.rate);
            if (!isNaN(kgVal) && !isNaN(rateVal)) next.amount = (kgVal * rateVal).toFixed(2);
          }
          return next;
        });
      };
      const updates = {};
      if (kgMatch) updates.kg = kgMatch[1];
      if (amountMatch) updates.amount = amountMatch[1].replace(/,/g, "");
      if (rateMatch) updates.rate = rateMatch[1].replace(/,/g, "");
      if (stationMatch) {
      const name = stationMatch[1].trim().slice(0, 40);
      updates.station = name;
      const match = STATION_OPTIONS.find((o) => name.toLowerCase().includes(o.toLowerCase()) || o.toLowerCase().includes(name.toLowerCase()));
      if (match) setStationOption(match);
      else setStationOption("other");
    }
      setReceiptData(updates);
      const found = Object.keys(updates).filter((k) => updates[k]);
      setOcrResult2(found.length > 0 ? `Auto-filled: ${found.join(", ")}` : "No details detected from receipt");
    } catch (e) {
      console.error("Receipt OCR failed:", e);
      setOcrResult2("Receipt scan failed");
    }
    setOcrRunning2(false);
  };

  const handleOdometerCapture = async (file) => {
    const dataUrl = await readFileAsDataURL(file) || generatePhotoDataUri("odometer");
    setPhotos((p) => ({ ...p, odometer: dataUrl }));
    setLocating(true);
    const coords = await requestLocation();
    setLocating(false);
    const ts = new Date().toISOString();
    if (coords) setOdometerCoords(coords);
    setOdometerTimestamp(ts);
    setOdometer("");
    if (coords && stationCoords) {
      const dist = haversineDistance(stationCoords, coords);
      if (dist > LOCATION_THRESHOLD) { setMismatchWarning({ distanceKm: (dist / 1000).toFixed(1) }); setLocationStatus("mismatch"); }
      else { setLocationStatus("matched"); }
    } else if (!coords || !stationCoords) { setLocationStatus("unavailable"); }
    setStep("odometer-review");
    setOcrRunning(true);
    try {
      const { data } = await Tesseract.recognize(dataUrl, "eng", { logger: (m) => { if (m.status === "recognizing text") setOcrResult(`OCR: ${Math.round(m.progress * 100)}%`); } });
      const nums = data.text.match(/\d{4,7}/g);
      if (nums && nums.length > 0) { const best = nums.sort((a, b) => b.length - a.length || parseInt(b) - parseInt(a))[0]; setOdometer(best); setOcrResult(`OCR: ${best}`); }
      else { setOcrResult("OCR: No number detected"); }
    } catch { setOcrResult("OCR failed"); }
    setOcrRunning(false);
  };

  const handleSubmitAnyway = () => { setMismatchWarning(null); handleSave(); };
  const handleRetake = () => { setMismatchWarning(null); setOdometerCoords(null); setOdometerTimestamp(null); setOdometer(""); setStep("odometer"); };

  const handleDriverSync = async () => {
    const phone = driverInfo?.phone || "";
    if (!phone) return;
    setOcrResult2("Syncing...");
    try {
      const ok = await pushSync(phone);
      setOcrResult2(ok ? "Synced! ✅" : "Sync failed");
    } catch {
      setOcrResult2("Sync failed");
    }
    setTimeout(() => setOcrResult2(""), 3000);
  };

  const handleSave = () => {
    const timeGapMin = stationTimestamp && odometerTimestamp ? ((new Date(odometerTimestamp) - new Date(stationTimestamp)) / 60000) : null;
    const mismatchDistance = stationCoords && odometerCoords ? haversineDistance(stationCoords, odometerCoords) : null;
    addFill({
      vehicleId, regNo, driver: driverName,
      ownerPhone: driverInfo?.ownerPhone || "",
      kg: parseFloat(receipt.kg) || parseFloat(pumpMeter.kg) || 0,
      rs: parseFloat(receipt.amount) || parseFloat(pumpMeter.amount) || 0,
      rate: parseFloat(receipt.rate) || 0,
      date: receipt.date || new Date().toISOString().slice(0, 10),
      time: receipt.time || new Date().toTimeString().slice(0, 5),
      station: receipt.station || "—",
      odometer: parseFloat(odometer) || 0,
      photos: { pumpMeter: photos.pumpMeter, fillingVideo: photos.fillingVideo, receipt: photos.receipt, odometer: photos.odometer },
      stationCoords, odometerCoords, stationPhotoTimestamp: stationTimestamp,
      odometerPhotoTimestamp: odometerTimestamp,
      timeGapMin: timeGapMin ? parseFloat(timeGapMin.toFixed(1)) : null,
      locationStatus, mismatchDistance: mismatchDistance ? parseFloat((mismatchDistance / 1000).toFixed(2)) : null,
    });
    setSaved(true);
  };

  // Poll sync retry status while saved screen is shown
  useEffect(() => {
    if (!saved) return;
    const iv = setInterval(() => {
      const phone = driverInfo?.ownerPhone || driverInfo?.phone || "";
      setSyncRetryStatus(phone ? getSyncRetryStatus(phone) : "");
    }, 2000);
    return () => clearInterval(iv);
  }, [saved, driverInfo]);

  if (saved) {
    const timeGapMin = stationTimestamp && odometerTimestamp ? ((new Date(odometerTimestamp) - new Date(stationTimestamp)) / 60000).toFixed(0) : null;
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[60%] bg-mint/5 rounded-full blur-[120px]" />
        <div className="relative z-10 w-full max-w-xs animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-mint/20 flex items-center justify-center mx-auto mb-6 shadow-glow-mint">
            <svg className="w-10 h-10 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-ink text-center mb-6 tracking-tight">{t.saved}</h2>
          <div className="floating-card p-5 mb-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-silver-dark">Vehicle</span><span className="font-semibold text-ink">{receipt.vehicleNo || regNo}</span></div>
              <div className="flex justify-between"><span className="text-silver-dark">{t.kg}</span><span className="font-semibold text-ink">{receipt.kg || pumpMeter.kg} kg</span></div>
              <div className="flex justify-between"><span className="text-silver-dark">Rate</span><span className="font-semibold text-ink">Rs {receipt.rate || "—"}/kg</span></div>
              <div className="flex justify-between"><span className="text-silver-dark">{t.amount}</span><span className="font-semibold text-ink">Rs {receipt.amount || pumpMeter.amount}</span></div>
              {receipt.date && <div className="flex justify-between"><span className="text-silver-dark">{t.date}</span><span className="font-semibold text-ink">{receipt.date}</span></div>}
              {receipt.time && <div className="flex justify-between"><span className="text-silver-dark">{t.time}</span><span className="font-semibold text-ink">{receipt.time}</span></div>}
              {receipt.station && <div className="flex justify-between"><span className="text-silver-dark">{t.station}</span><span className="font-semibold text-ink">{receipt.station}</span></div>}
              <div className="flex justify-between"><span className="text-silver-dark">Odometer</span><span className="font-semibold text-ink">{odometer} km</span></div>
              {photos.fillingVideo && <div className="flex justify-between"><span className="text-accent text-xs flex items-center gap-1"><span className="w-2 h-2 bg-accent rounded-full" /> Filling video recorded</span></div>}
              {locationStatus === "matched" && <div className="flex justify-between"><span className="text-mint text-xs flex items-center gap-1"><span className="w-2 h-2 bg-mint rounded-full" /> Location matched</span></div>}
              {locationStatus === "mismatch" && <div className="flex justify-between"><span className="text-yellow-400 text-xs flex items-center gap-1"><span className="w-2 h-2 bg-yellow-400 rounded-full" /> Location mismatch</span></div>}
              {locationStatus === "unavailable" && <div className="flex justify-between"><span className="text-silver-dark text-xs flex items-center gap-1"><span className="w-2 h-2 bg-silver-dark rounded-full" /> Location unavailable</span></div>}
              {syncRetryStatus && (
                <div className="flex justify-between pt-2 border-t border-black/5 mt-2">
                  <span className="text-silver-dark text-xs">Sync</span>
                  <span className={`text-xs font-semibold ${syncRetryStatus === "synced" ? "text-mint" : "text-yellow-400"}`}>
                    {syncRetryStatus === "synced" ? "Synced ✓" : syncRetryStatus}
                  </span>
                </div>
              )}
            </div>
          </div>
          {isDriver ? (
            <button onClick={resetForm} className="w-full pill-button-mint text-base">{t.fillAgain}</button>
          ) : (
            <button onClick={() => navigate("/dashboard")} className="w-full pill-button-primary text-base">{t.goToDashboard}</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col relative">
      {permissionDenied && step === "start" && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/10 px-4 py-3 text-sm text-yellow-300 text-center font-light">
          Location access is required for fraud protection. Please enable in phone settings.
        </div>
      )}

      {mismatchWarning && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/10 px-4 py-4">
          <div className="max-w-sm mx-auto">
            <div className="flex items-start gap-3 mb-3">
              <svg className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              <p className="text-sm text-yellow-200 font-light">
                Your odometer photo was taken <strong className="font-semibold">{mismatchWarning.distanceKm} km</strong> away from the CNG station.
              </p>
            </div>
            <div className="flex gap-2 ml-8">
              <button onClick={handleRetake} className="flex-1 bg-yellow-500/20 text-yellow-300 text-sm font-semibold py-2.5 rounded-xl hover:bg-yellow-500/30 transition-all">Retake Photo</button>
              <button onClick={handleSubmitAnyway} className="flex-1 border border-yellow-500/30 text-yellow-300 text-sm font-semibold py-2.5 rounded-xl hover:bg-yellow-500/10 transition-all">Submit Anyway</button>
            </div>
          </div>
        </div>
      )}

      {step === "start" && !mismatchWarning && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/20 rounded-full blur-3xl" />
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center mb-6 shadow-glow relative">
              <svg className="w-12 h-12 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-ink mb-2 tracking-tight">{t.cngFilled}</h1>
          <p className="text-silver-dark text-sm mb-2 font-light">{regNo}</p>
          <p className="text-silver-dark text-xs mb-10 font-light">{t.stepPhotoVerification}</p>
          <button onClick={() => setStep("filling-video")} className="w-full max-w-xs pill-button-primary text-xl !py-5">{t.cngFilled}</button>
          <button onClick={handleDriverSync} className="mt-3 w-full max-w-xs bg-black/5 hover:bg-black/10 text-ink text-sm font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Sync to Server
          </button>
          {ocrResult2 && <p className="text-xs mt-2 text-mint font-light">{ocrResult2}</p>}
        </div>
      )}

      {step !== "start" && !mismatchWarning && <StepIndicator current={step} steps={STEPS} />}

      {step === "filling-video" && !mismatchWarning && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="text-ink font-semibold text-lg mb-2 tracking-tight">Record Filling Video</p>
          <p className="text-silver-dark text-xs mb-8 font-light">Record the complete filling from 0 to finish</p>
          <label className="w-56 h-56 bg-black/5 border border-black/10 rounded-4xl flex flex-col items-center justify-center hover:bg-black/10 transition-all active:scale-[0.97] cursor-pointer">
            <svg className="w-20 h-20 text-ink/30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-ink/50 text-sm font-semibold">Record Video</span>
            <input type="file" accept="video/*" capture="environment" className="hidden" onChange={async (e) => { if (e.target.files[0]) await handleFillingVideoCapture(e.target.files[0]); e.target.value = ""; }} />
          </label>
          {photos.fillingVideo && <p className="text-mint text-xs mt-4 font-light">Video captured ✓</p>}
        </div>
      )}

      {step === "pump-meter" && !mismatchWarning && <CameraCapture t={t} onCapture={handlePumpMeterCapture} label={t.takePumpMeterPhoto} />}

      {step === "receipt" && !mismatchWarning && <CameraCapture t={t} onCapture={handleReceiptCapture} label={t.takeReceiptPhoto} locating={locating} />}

      {step === "receipt-review" && !mismatchWarning && (
        <div className="flex-1 px-6 py-6 animate-fade-in">
          <div className="max-w-sm mx-auto">
            <h3 className="text-xl font-bold text-ink mb-1 tracking-tight">{t.receiptDetails}</h3>
            <p className="text-xs text-silver-dark mb-5 font-light">{t.editIfIncorrect}</p>
            {ocrRunning2 && <div className="flex items-center gap-2 mb-4"><div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" /><span className="text-xs text-accent font-light animate-pulse">{ocrResult2 || "Scanning receipt..."}</span></div>}
            {ocrResult2 && !ocrRunning2 && <p className={`text-xs mb-4 font-light ${ocrResult2.includes("failed") || ocrResult2.includes("No details") ? "text-yellow-400" : "text-mint"}`}>{ocrResult2}</p>}
            <ReviewFields fields={[
              { key: "kg", label: `${t.kg} (Kilograms)` }, { key: "rate", label: "Rate (Rs/kg)" }, { key: "amount", label: `${t.amount} (Rs)` },
              { key: "vehicleNo", label: "Vehicle Number" }, { key: "date", label: t.date }, { key: "time", label: t.time },
            ]} data={receipt} onChange={(key, val) => {
              setReceipt((r) => {
                const next = { ...r, [key]: val };
                if ((key === "kg" || key === "rate") && next.kg && next.rate) {
                  const kgVal = parseFloat(next.kg);
                  const rateVal = parseFloat(next.rate);
                  if (!isNaN(kgVal) && !isNaN(rateVal)) next.amount = (kgVal * rateVal).toFixed(2);
                }
                return next;
              });
            }} />
            <div className="floating-card p-5 mt-4">
              <label className="text-xs text-silver-dark font-medium tracking-wide block mb-2">Station</label>
              <select value={stationOption} onChange={(e) => { const v = e.target.value; setStationOption(v); if (v !== "other") setReceipt((r) => ({ ...r, station: v })); }} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-sm text-ink outline-none">
                <option value="">Select station</option>
                {STATION_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                <option value="other">Other</option>
              </select>
              {stationOption === "other" && (
                <input type="text" value={receipt.station || ""} onChange={(e) => setReceipt((r) => ({ ...r, station: e.target.value }))} placeholder="Enter station name" className="input-field mt-3" />
              )}
            </div>
            <button onClick={() => setStep("odometer")} className="w-full pill-button-primary text-base mt-6">{t.continue}</button>
          </div>
        </div>
      )}

      {step === "odometer" && !mismatchWarning && <CameraCapture t={t} onCapture={handleOdometerCapture} label={t.takeOdometerPhoto} locating={locating} />}

      {step === "odometer-review" && !mismatchWarning && (
        <div className="flex-1 px-6 py-6 animate-fade-in">
          <div className="max-w-sm mx-auto">
            <h3 className="text-xl font-bold text-ink mb-1 tracking-tight">{t.odometerReading}</h3>
            <p className="text-xs text-silver-dark mb-5 font-light">{t.editIfIncorrect}</p>
            <div className="floating-card p-5">
              <label className="text-xs text-silver-dark font-medium tracking-wide">{t.odometerReading} (km)</label>
              <input type="text" value={odometer} onChange={(e) => setOdometer(e.target.value)} className="input-field mt-1.5" />
              {ocrRunning && <p className="text-xs text-accent mt-2 animate-pulse font-light">Reading odometer from photo...</p>}
              {ocrResult && !ocrRunning && <p className={`text-xs mt-2 font-light ${ocrResult.includes("failed") || ocrResult.includes("No number") ? "text-yellow-400" : "text-mint"}`}>{ocrResult}</p>}
            </div>

            <div className="floating-card p-5 mt-6 border border-accent/10 bg-accent/[0.02]">
              <p className="text-sm font-semibold text-ink/80 mb-4 tracking-wide">{t.summary}</p>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-silver-dark">Vehicle</span><span className="font-semibold text-ink">{receipt.vehicleNo || regNo}</span></div>
                <div className="flex justify-between"><span className="text-silver-dark">{t.kg}</span><span className="font-semibold text-ink">{receipt.kg || pumpMeter.kg} kg</span></div>
                <div className="flex justify-between"><span className="text-silver-dark">Rate</span><span className="font-semibold text-ink">Rs {receipt.rate || "—"}/kg</span></div>
                <div className="flex justify-between"><span className="text-silver-dark">{t.amount}</span><span className="font-semibold text-ink">Rs {receipt.amount || pumpMeter.amount}</span></div>
                {receipt.date && <div className="flex justify-between"><span className="text-silver-dark">{t.date}</span><span className="font-semibold text-ink">{receipt.date}</span></div>}
                {receipt.time && <div className="flex justify-between"><span className="text-silver-dark">{t.time}</span><span className="font-semibold text-ink">{receipt.time}</span></div>}
                {receipt.station && <div className="flex justify-between"><span className="text-silver-dark">{t.station}</span><span className="font-semibold text-ink">{receipt.station}</span></div>}
                <div className="flex justify-between"><span className="text-silver-dark">Odometer</span><span className="font-semibold text-ink">{odometer} km</span></div>
                {photos.fillingVideo && <div className="flex justify-between"><span className="text-accent text-xs flex items-center gap-1"><span className="w-2 h-2 bg-accent rounded-full" /> Filling video recorded</span></div>}
                {stationCoords && <div className="flex justify-between"><span className="text-silver-dark">Station GPS</span><span className="font-semibold text-ink text-xs">{stationCoords.lat.toFixed(4)}, {stationCoords.lng.toFixed(4)}</span></div>}
              </div>
              {(stationCoords || odometerCoords) && <div className="mt-4"><LocationMap stationCoords={stationCoords} odometerCoords={odometerCoords} height={180} /></div>}
            </div>

            <button onClick={handleSave} className="w-full pill-button-mint text-base mt-6">Save & Complete</button>
          </div>
        </div>
      )}
    </div>
  );
}