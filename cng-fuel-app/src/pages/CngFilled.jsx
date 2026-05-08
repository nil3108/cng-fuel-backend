import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import useGeolocation from "../hooks/useGeolocation";
import { haversineDistance } from "../utils/distance";
import { readFileAsDataURL, generatePhotoDataUri } from "../utils/photoPlaceholder";
import LocationMap from "../components/LocationMap";
import { addFill } from "../db/database";
import Tesseract from "tesseract.js";

const STEPS = ["pump-meter", "receipt", "odometer"];

const LOCATION_THRESHOLD = 500;

function CameraCapture({ onCapture, label, t, locating }) {
  const inputRef = useRef(null);
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <p className="text-gray-700 font-semibold text-lg mb-2">{label}</p>
      <p className="text-gray-400 text-xs mb-8">{t.cameraOnly}</p>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={locating}
        className="w-56 h-56 bg-white border-2 border-primary rounded-3xl flex flex-col items-center justify-center shadow-sm hover:bg-primary/5 transition-colors active:scale-[0.97] disabled:opacity-50"
      >
        {locating ? (
          <div className="text-center">
            <svg className="w-12 h-12 text-primary/50 mx-auto mb-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-primary/60 text-sm font-semibold">Getting location...</span>
          </div>
        ) : (
          <div className="text-center">
            <svg className="w-20 h-20 text-primary/50 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-primary/70 text-sm font-semibold">{t.openCamera}</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files[0]) onCapture(e.target.files[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ReviewFields({ fields, data, onChange }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="text-xs text-gray-500 font-medium">{f.label}</label>
          <input
            type="text"
            value={data[f.key] || ""}
            onChange={(e) => onChange(f.key, e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm outline-none focus:border-primary mt-0.5"
          />
        </div>
      ))}
    </div>
  );
}

function StepIndicator({ current }) {
  const idx = STEPS.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-2 px-4 pt-6 pb-2">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            i <= idx ? "bg-primary text-white" : "bg-gray-200 text-gray-400"
          }`}>{i + 1}</div>
          {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < idx ? "bg-primary" : "bg-gray-200"}`} />}
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

  const [step, setStep] = useState("start");
  const [locating, setLocating] = useState(false);
  const [pumpMeter, setPumpMeter] = useState({ kg: "", amount: "" });
  const [receipt, setReceipt] = useState({ kg: "", rate: "", amount: "", vehicleNo: "", date: "", time: "", station: "" });
  const [odometer, setOdometer] = useState("");
  const [saved, setSaved] = useState(false);

  const [photos, setPhotos] = useState({ pumpMeter: null, receipt: null, odometer: null });

  const [stationCoords, setStationCoords] = useState(null);
  const [stationTimestamp, setStationTimestamp] = useState(null);
  const [odometerCoords, setOdometerCoords] = useState(null);
  const [odometerTimestamp, setOdometerTimestamp] = useState(null);
  const [locationStatus, setLocationStatus] = useState("pending");

  const [mismatchWarning, setMismatchWarning] = useState(null);
  const [locationUnavailable, setLocationUnavailable] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrResult, setOcrResult] = useState("");

  const resetForm = useCallback(() => {
    setStep("start");
    setPumpMeter({ kg: "", amount: "" });
    setReceipt({ kg: "", rate: "", amount: "", vehicleNo: "", date: "", time: "", station: "" });
    setOdometer("");
    setSaved(false);
    setPhotos({ pumpMeter: null, receipt: null, odometer: null });
    setStationCoords(null);
    setStationTimestamp(null);
    setOdometerCoords(null);
    setOdometerTimestamp(null);
    setLocationStatus("pending");
    setMismatchWarning(null);
    setLocationUnavailable(false);
    setOcrRunning(false);
    setOcrResult("");
  }, []);

  const handlePumpMeterCapture = async (file) => {
    const dataUrl = await readFileAsDataURL(file) || generatePhotoDataUri("pumpMeter");
    setPhotos((p) => ({ ...p, pumpMeter: dataUrl }));
    setPumpMeter({ kg: "", amount: "" });
    setStep("pump-meter-review");
  };

  const captureGps = async () => {
    setLocating(true);
    const coords = await requestLocation();
    setLocating(false);
    if (!coords) {
      setLocationUnavailable(true);
      return null;
    }
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
    setReceipt({ kg: "", rate: "", amount: "", vehicleNo: regNo });
    setStep("receipt-review");
  };

  const handleOdometerCapture = async (file) => {
    const dataUrl = await readFileAsDataURL(file) || generatePhotoDataUri("odometer");
    setPhotos((p) => ({ ...p, odometer: dataUrl }));
    setLocating(true);
    const coords = await requestLocation();
    setLocating(false);
    const ts = new Date().toISOString();

    if (coords) {
      setOdometerCoords(coords);
    }
    setOdometerTimestamp(ts);
    setOdometer("");

    if (coords && stationCoords) {
      const dist = haversineDistance(stationCoords, coords);
      if (dist > LOCATION_THRESHOLD) {
        setMismatchWarning({ distanceKm: (dist / 1000).toFixed(1) });
        setLocationStatus("mismatch");
      } else {
        setLocationStatus("matched");
      }
    } else if (!coords || !stationCoords) {
      setLocationStatus("unavailable");
    }
    setStep("odometer-review");

    setOcrRunning(true);
    try {
      const { data } = await Tesseract.recognize(dataUrl, "eng", {
        logger: (m) => { if (m.status === "recognizing text") setOcrResult(`OCR: ${Math.round(m.progress * 100)}%`); },
      });
      const nums = data.text.match(/\d{4,7}/g);
      if (nums && nums.length > 0) {
        const best = nums.sort((a, b) => b.length - a.length || parseInt(b) - parseInt(a))[0];
        setOdometer(best);
        setOcrResult(`OCR: ${best}`);
      } else {
        setOcrResult("OCR: No number detected");
      }
    } catch {
      setOcrResult("OCR failed");
    }
    setOcrRunning(false);
  };

  const handleSubmitAnyway = () => {
    setMismatchWarning(null);
    handleSave();
  };

  const handleRetake = () => {
    setMismatchWarning(null);
    setOdometerCoords(null);
    setOdometerTimestamp(null);
    setOdometer("");
    setStep("odometer");
  };

  const handleSave = () => {
    const timeGapMin = stationTimestamp && odometerTimestamp
      ? ((new Date(odometerTimestamp) - new Date(stationTimestamp)) / 60000)
      : null;

    const mismatchDistance = stationCoords && odometerCoords
      ? haversineDistance(stationCoords, odometerCoords)
      : null;

    addFill({
      vehicleId,
      regNo,
      driver: driverName,
      kg: parseFloat(receipt.kg) || parseFloat(pumpMeter.kg) || 0,
      rs: parseFloat(receipt.amount) || parseFloat(pumpMeter.amount) || 0,
      rate: parseFloat(receipt.rate) || 0,
      date: receipt.date || new Date().toISOString().slice(0, 10),
      time: receipt.time || new Date().toTimeString().slice(0, 5),
      station: receipt.station || "—",
      odometer: parseFloat(odometer) || 0,
      photos: { pumpMeter: photos.pumpMeter, receipt: photos.receipt, odometer: photos.odometer },
      pumpMeterPhoto: photos.pumpMeter,
      receiptPhoto: photos.receipt,
      odometerPhoto: photos.odometer,
      stationCoords,
      odometerCoords,
      stationPhotoTimestamp: stationTimestamp,
      odometerPhotoTimestamp: odometerTimestamp,
      timeGapMin: timeGapMin ? parseFloat(timeGapMin.toFixed(1)) : null,
      locationStatus,
      mismatchDistance: mismatchDistance ? parseFloat((mismatchDistance / 1000).toFixed(2)) : null,
    });

    setSaved(true);
  };

  if (saved) {
    const timeGapMin = stationTimestamp && odometerTimestamp
      ? ((new Date(odometerTimestamp) - new Date(stationTimestamp)) / 60000).toFixed(0)
      : null;
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{t.saved}</h2>
        <div className="bg-white rounded-2xl shadow-sm p-5 w-full max-w-xs mb-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Vehicle</span><span className="font-semibold">{receipt.vehicleNo || regNo}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{t.kg}</span><span className="font-semibold">{receipt.kg || pumpMeter.kg} kg</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Rate</span><span className="font-semibold">Rs {receipt.rate || "—"}/kg</span></div>
            <div className="flex justify-between"><span className="text-gray-500">{t.amount}</span><span className="font-semibold">Rs {receipt.amount || pumpMeter.amount}</span></div>
            {receipt.date && <div className="flex justify-between"><span className="text-gray-500">{t.date}</span><span className="font-semibold">{receipt.date}</span></div>}
            {receipt.time && <div className="flex justify-between"><span className="text-gray-500">{t.time}</span><span className="font-semibold">{receipt.time}</span></div>}
            {receipt.station && <div className="flex justify-between"><span className="text-gray-500">{t.station}</span><span className="font-semibold">{receipt.station}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">Odometer</span><span className="font-semibold">{odometer} km</span></div>
            {locationStatus === "matched" && (
              <div className="flex justify-between"><span className="text-green-600 text-xs flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> Location matched</span></div>
            )}
            {locationStatus === "mismatch" && (
              <div className="flex justify-between"><span className="text-yellow-600 text-xs flex items-center gap-1"><span className="w-2 h-2 bg-yellow-500 rounded-full" /> Location mismatch — submitted anyway</span></div>
            )}
            {locationStatus === "unavailable" && (
              <div className="flex justify-between"><span className="text-gray-400 text-xs flex items-center gap-1"><span className="w-2 h-2 bg-gray-400 rounded-full" /> Location unavailable</span></div>
            )}
          </div>
        </div>
        {isDriver ? (
          <button onClick={resetForm} className="w-full max-w-xs bg-accent text-white font-bold py-3.5 rounded-xl text-lg shadow-lg">
            {t.fillAgain}
          </button>
        ) : (
          <button onClick={() => navigate("/dashboard")} className="w-full max-w-xs bg-primary text-white font-bold py-3.5 rounded-xl text-lg">
            {t.goToDashboard}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      {permissionDenied && step === "start" && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-sm text-yellow-800 text-center">
          Location access is required for fraud protection. Please enable in phone settings.
        </div>
      )}

      {mismatchWarning && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-4">
          <div className="max-w-sm mx-auto">
            <div className="flex items-start gap-2 mb-2">
              <svg className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm text-yellow-800 font-medium">
                Your odometer photo was taken <strong>{mismatchWarning.distanceKm} km</strong> away from the CNG station. Please retake odometer photo at the station.
              </p>
            </div>
            <div className="flex gap-2 mt-2 ml-7">
              <button onClick={handleRetake} className="flex-1 bg-yellow-600 text-white text-sm font-semibold py-2 rounded-xl">
                Retake Odometer Photo
              </button>
              <button onClick={handleSubmitAnyway} className="flex-1 bg-white border border-yellow-400 text-yellow-700 text-sm font-semibold py-2 rounded-xl">
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "start" && !mismatchWarning && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center mb-6 shadow-lg animate-pulse">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-primary mb-2">{t.cngFilled}</h1>
          <p className="text-gray-400 text-sm mb-2">{regNo}</p>
          <p className="text-gray-400 text-xs mb-10">{t.stepPhotoVerification}</p>
          <button
            onClick={() => setStep("pump-meter")}
            className="w-full max-w-xs bg-accent hover:bg-accent-dark text-white font-bold py-5 rounded-2xl text-xl shadow-lg active:scale-[0.97] transition-all"
          >
            {t.cngFilled}
          </button>
        </div>
      )}

      {step !== "start" && !mismatchWarning && <StepIndicator current={step} />}

      {step === "pump-meter" && !mismatchWarning && (
        <CameraCapture t={t} onCapture={handlePumpMeterCapture} label={t.takePumpMeterPhoto} />
      )}

      {step === "pump-meter-review" && !mismatchWarning && (
        <div className="flex-1 px-4 py-6">
          <div className="max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-primary mb-1">{t.pumpMeterReading}</h3>
            <p className="text-xs text-gray-400 mb-4">{t.editIfIncorrect}</p>
            <ReviewFields
              fields={[
                { key: "kg", label: `${t.kg} (Kilograms)` },
                { key: "amount", label: `${t.amount} (Rs)` },
              ]}
              data={pumpMeter}
              onChange={(key, val) => setPumpMeter((p) => ({ ...p, [key]: val }))}
            />
            <button onClick={() => setStep("receipt")} className="w-full bg-primary text-white font-bold py-3.5 rounded-xl text-lg mt-6">
              {t.continue}
            </button>
          </div>
        </div>
      )}

      {step === "receipt" && !mismatchWarning && (
        <CameraCapture t={t} onCapture={handleReceiptCapture} label={t.takeReceiptPhoto} locating={locating} />
      )}

      {step === "receipt-review" && !mismatchWarning && (
        <div className="flex-1 px-4 py-6">
          <div className="max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-primary mb-1">{t.receiptDetails}</h3>
            <p className="text-xs text-gray-400 mb-4">{t.editIfIncorrect}</p>
            <ReviewFields
              fields={[
                { key: "kg", label: `${t.kg} (Kilograms)` },
                { key: "rate", label: "Rate (Rs/kg)" },
                { key: "amount", label: `${t.amount} (Rs)` },
                { key: "vehicleNo", label: "Vehicle Number" },
                { key: "date", label: t.date },
                { key: "time", label: t.time },
                { key: "station", label: t.station },
              ]}
              data={receipt}
              onChange={(key, val) => setReceipt((r) => ({ ...r, [key]: val }))}
            />
            <button onClick={() => setStep("odometer")} className="w-full bg-primary text-white font-bold py-3.5 rounded-xl text-lg mt-6">
              {t.continue}
            </button>
          </div>
        </div>
      )}

      {step === "odometer" && !mismatchWarning && (
        <CameraCapture t={t} onCapture={handleOdometerCapture} label={t.takeOdometerPhoto} locating={locating} />
      )}

      {step === "odometer-review" && !mismatchWarning && (
        <div className="flex-1 px-4 py-6">
          <div className="max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-primary mb-1">{t.odometerReading}</h3>
            <p className="text-xs text-gray-400 mb-4">{t.editIfIncorrect}</p>
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <label className="text-xs text-gray-500 font-medium">{t.odometerReading} (km)</label>
              <input
                type="text"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm outline-none focus:border-primary mt-1"
              />
              {ocrRunning && <p className="text-xs text-accent mt-1.5 animate-pulse">Reading odometer from photo...</p>}
              {ocrResult && !ocrRunning && <p className={`text-xs mt-1.5 ${ocrResult.includes("failed") || ocrResult.includes("No number") ? "text-yellow-600" : "text-green-600"}`}>{ocrResult}</p>}
            </div>

            <div className="bg-green-50 rounded-2xl border border-green-200 p-4 mt-6">
              <p className="text-sm font-semibold text-green-700 mb-3">{t.summary}</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-green-600">Vehicle</span><span className="font-semibold text-green-800">{receipt.vehicleNo || regNo}</span></div>
                <div className="flex justify-between"><span className="text-green-600">{t.kg}</span><span className="font-semibold text-green-800">{receipt.kg || pumpMeter.kg} kg</span></div>
                <div className="flex justify-between"><span className="text-green-600">Rate</span><span className="font-semibold text-green-800">Rs {receipt.rate || "—"}/kg</span></div>
                <div className="flex justify-between"><span className="text-green-600">{t.amount}</span><span className="font-semibold text-green-800">Rs {receipt.amount || pumpMeter.amount}</span></div>
                {receipt.date && <div className="flex justify-between"><span className="text-green-600">{t.date}</span><span className="font-semibold text-green-800">{receipt.date}</span></div>}
                {receipt.time && <div className="flex justify-between"><span className="text-green-600">{t.time}</span><span className="font-semibold text-green-800">{receipt.time}</span></div>}
                {receipt.station && <div className="flex justify-between"><span className="text-green-600">{t.station}</span><span className="font-semibold text-green-800">{receipt.station}</span></div>}
                <div className="flex justify-between"><span className="text-green-600">Odometer</span><span className="font-semibold text-green-800">{odometer} km</span></div>
                {stationCoords && (
                  <div className="flex justify-between"><span className="text-green-600">Station GPS</span><span className="font-semibold text-green-800 text-xs">{stationCoords.lat.toFixed(4)}, {stationCoords.lng.toFixed(4)}</span></div>
                )}
              </div>
              {(stationCoords || odometerCoords) && (
                <div className="mt-3">
                  <LocationMap stationCoords={stationCoords} odometerCoords={odometerCoords} height={180} />
                </div>
              )}
            </div>

            <button onClick={handleSave} className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl text-lg shadow-lg mt-6">
              Save & Complete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
