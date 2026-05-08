import { useState, useMemo } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import BottomNav from "../components/BottomNav";
import { getFills, getVehicles } from "../db/database";

export default function MediaGallery() {
  const { t } = useLanguage();
  const fills = getFills();
  const vehicles = getVehicles();
  const [previewImg, setPreviewImg] = useState(null);
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const allMedia = useMemo(() => {
    const items = [];
    fills.forEach((f) => {
      if (f.photos?.pumpMeter) items.push({ type: "Pump Meter", fill: f, src: f.photos.pumpMeter });
      if (f.photos?.receipt) items.push({ type: "Receipt", fill: f, src: f.photos.receipt });
      if (f.photos?.odometer) items.push({ type: "Odometer", fill: f, src: f.photos.odometer });
    });
    return items;
  }, [fills]);

  const filteredMedia = useMemo(() => {
    return allMedia.filter((m) => {
      if (vehicleFilter !== "all" && m.fill.regNo !== vehicleFilter) return false;
      if (dateFrom && m.fill.date < dateFrom) return false;
      if (dateTo && m.fill.date > dateTo) return false;
      return true;
    });
  }, [allMedia, vehicleFilter, dateFrom, dateTo]);

  const clearFilters = () => { setVehicleFilter("all"); setDateFrom(""); setDateTo(""); };

  return (
    <div className="min-h-screen bg-primary pb-24">
      {previewImg && (
        <div className="fixed inset-0 z-[100] bg-ink/95 flex flex-col items-center justify-center" onClick={() => setPreviewImg(null)}>
          <button onClick={() => setPreviewImg(null)} className="absolute top-6 right-6 w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 z-10 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={previewImg} alt="Preview" className="max-w-[92vw] max-h-[80vh] rounded-3xl shadow-2xl object-contain" />
        </div>
      )}

      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Media</h1>
          <p className="text-silver-dark text-xs font-light">{filteredMedia.length} of {allMedia.length} photos</p>
        </div>
        <p className="text-silver-dark text-sm font-light">Captured during CNG fills</p>
      </div>

      <div className="px-6 space-y-3 mb-4">
        <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-sm text-ink outline-none">
          <option value="all">All Vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.regNo}>{v.regNo}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="flex-1 bg-white border border-black/10 rounded-xl px-4 py-3 text-sm text-ink outline-none" placeholder="From date" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="flex-1 bg-white border border-black/10 rounded-xl px-4 py-3 text-sm text-ink outline-none" placeholder="To date" />
        </div>
        {(vehicleFilter !== "all" || dateFrom || dateTo) && (
          <button onClick={clearFilters} className="w-full bg-black/5 hover:bg-black/10 text-silver-dark text-xs font-medium py-2.5 rounded-xl transition-all border border-black/5">
            Clear Filters
          </button>
        )}
      </div>

      <div className="px-6">
        {filteredMedia.length === 0 ? (
          <div className="floating-card p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-silver-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-silver-dark text-sm font-light">No photos match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredMedia.map((m, i) => (
              <button key={i} onClick={() => setPreviewImg(m.src)} className="floating-card overflow-hidden text-left group active:scale-[0.98] transition-all">
                <div className="aspect-square bg-primary relative">
                  <img src={m.src} alt={m.type} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 text-[10px] font-semibold bg-white/60 text-ink px-2 py-1 rounded-lg backdrop-blur">{m.type}</span>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-ink truncate">{m.fill.regNo || "—"}</p>
                  <p className="text-xs text-silver-dark font-light">{m.fill.date}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}