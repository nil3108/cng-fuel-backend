import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { addVehicle, getVehicles } from "../db/database";

export default function AddVehicle() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [regNo, setRegNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(null);
  const [error, setError] = useState("");
  const [rcFront, setRcFront] = useState(null);
  const [rcBack, setRcBack] = useState(null);
  const [added, setAdded] = useState(false);

  const handleFetch = () => {
    const key = regNo.toUpperCase().trim();
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setFetched({ make: "Tata Motors", model: "Ace CNG", fuelType: "CNG", regDate: "2022-03-15", insuranceExpiry: "2025-06-20", ownerName: "Rajesh Patel" });
    }, 1500);
  };

  const handleAdd = () => {
    addVehicle({ regNo: regNo.toUpperCase().trim(), ...fetched, rcFront: rcFront ? "uploaded" : null, rcBack: rcBack ? "uploaded" : null });
    setAdded(true);
    setTimeout(() => {
      const all = getVehicles();
      navigate(all.length > 1 ? "/add-driver" : "/add-driver");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-brand-bg px-4 py-8">
      <div className="max-w-sm mx-auto">
        <button onClick={() => navigate("/register")} className="text-primary/60 mb-6 flex items-center gap-1 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"><span className="text-white text-xs font-bold">2</span></div>
          <div><h2 className="text-xl font-bold text-primary">{t.addVehicle}</h2><p className="text-gray-500 text-xs">Register your CNG vehicle</p></div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4 mb-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t.vehicleRegNo}</label>
            <div className="flex gap-2">
              <input type="text" value={regNo} onChange={(e) => setRegNo(e.target.value.toUpperCase())} placeholder="e.g. GJ-06-AB-1234" className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 outline-none focus:border-primary uppercase" />
              <button onClick={handleFetch} disabled={regNo.length < 6 || loading} className="bg-primary disabled:bg-gray-300 text-white px-4 rounded-xl text-sm font-semibold whitespace-nowrap transition-all disabled:text-gray-500">
                {loading ? t.processing : t.fetchDetails}
              </button>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>}

          {fetched && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl px-3 py-2.5"><p className="text-xs text-gray-500">{t.vehicleMake}</p><p className="text-sm font-semibold text-gray-800">{fetched.make} {fetched.model}</p></div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5"><p className="text-xs text-gray-500">{t.fuelType}</p><p className="text-sm font-semibold text-green-600">{fetched.fuelType}</p></div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5"><p className="text-xs text-gray-500">{t.regDate}</p><p className="text-sm font-semibold text-gray-800">{fetched.regDate}</p></div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5"><p className="text-xs text-gray-500">{t.insuranceExpiry}</p><p className="text-sm font-semibold text-gray-800">{fetched.insuranceExpiry}</p></div>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-2.5"><p className="text-xs text-gray-500">{t.ownerName}</p><p className="text-sm font-semibold text-gray-800">{fetched.ownerName}</p></div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">{t.uploadRC}</label>
                <div className="flex gap-3">
                  <FileUpload label={t.front} onChange={setRcFront} value={rcFront} />
                  <FileUpload label={t.back} onChange={setRcBack} value={rcBack} />
                </div>
              </div>

              <button onClick={handleAdd} disabled={!rcFront || !rcBack || added} className="w-full bg-accent disabled:bg-gray-300 text-white font-bold py-3.5 rounded-xl text-lg transition-all disabled:text-gray-500">
                {added ? t.saved : t.addVehicleBtn}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FileUpload({ label, onChange, value }) {
  return (
    <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl py-6 cursor-pointer hover:border-primary transition-colors">
      {value ? (
        <div className="text-center"><svg className="w-6 h-6 text-green-500 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span className="text-xs text-green-600 font-medium">{label} ✓</span></div>
      ) : (
        <div className="text-center"><svg className="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span className="text-xs text-gray-500">{label}</span></div>
      )}
      <input type="file" accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files[0])} />
    </label>
  );
}
