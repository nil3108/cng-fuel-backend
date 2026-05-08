import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getOwner, getVehicles, getDrivers, getFills } from "../db/database";
import { downloadCsv } from "../utils/exportCsv";

const TABS = ["Overview", "Owners", "Vehicles", "Drivers", "Fills", "Media"];

function StatCard({ label, value, color }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 text-center">
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-gray-400 text-xs mt-1">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("Overview");
  const [previewImg, setPreviewImg] = useState(null);

  const owner = getOwner();
  const vehicles = getVehicles();
  const drivers = getDrivers();
  const fills = getFills();

  const fillsByVehicle = useMemo(() => {
    const map = {};
    fills.forEach((f) => { map[f.vehicleId] = (map[f.vehicleId] || 0) + 1; });
    return map;
  }, [fills]);

  const handleLogout = () => {
    sessionStorage.removeItem("cng_admin");
    navigate("/admin-login");
  };

  const videoFills = fills.filter((f) => f.photos && (Array.isArray(f.photos) ? f.photos.length > 0 : (f.photos.pumpMeter || f.photos.receipt || f.photos.odometer)));
  const allMedia = [];
  fills.forEach((f) => {
    if (f.pumpMeterPhoto) allMedia.push({ type: "Pump Meter", fill: f, src: f.pumpMeterPhoto });
    if (f.receiptPhoto) allMedia.push({ type: "Receipt", fill: f, src: f.receiptPhoto });
    if (f.odometerPhoto) allMedia.push({ type: "Odometer", fill: f, src: f.odometerPhoto });
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-8">
      {previewImg && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center" onClick={() => setPreviewImg(null)}>
          <button onClick={() => setPreviewImg(null)} className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white z-10">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={previewImg} alt="Preview" className="max-w-[95vw] max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
          <p className="text-white/50 text-xs mt-4">Tap anywhere to close</p>
        </div>
      )}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Admin Panel</h1>
            <p className="text-gray-400 text-xs">CNG Fuel Credit Service</p>
          </div>
          <button onClick={handleLogout} className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {tab === "Overview" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 mb-6">
              <StatCard label="Owners" value={owner ? 1 : 0} color="text-blue-400" />
              <StatCard label="Vehicles" value={vehicles.length} color="text-green-400" />
              <StatCard label="Drivers" value={drivers.length} color="text-yellow-400" />
              <StatCard label="Fill Records" value={fills.length} color="text-accent" />
            </div>

            <div className="bg-gray-900 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-gray-300 mb-3">Recent Fills</p>
              {fills.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-4">No fill records yet</p>
              ) : (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {fills.slice(0, 20).map((f) => (
                    <div key={f.id} className="flex justify-between items-center py-1.5 border-b border-gray-800 last:border-0 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-gray-200">{f.regNo || "—"}</span>
                        <span className="text-gray-500 truncate">{f.date} {f.station ? `· ${f.station}` : ""}</span>
                      </div>
                      <span className="text-gray-400 shrink-0 ml-2">{f.kg}kg · Rs{f.rs}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-900 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-gray-300 mb-3">Storage Summary</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-gray-400">Total Photos Stored</p>
                  <p className="text-xl font-bold text-white">{allMedia.length}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-gray-400">Fills with Photos</p>
                  <p className="text-xl font-bold text-white">{videoFills.length}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "Owners" && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-300">All Owners</p>
              {owner && (
                <button onClick={() => downloadCsv([owner], "owners")} className="bg-accent/20 text-accent text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-accent/30 transition-colors">
                  Export CSV
                </button>
              )}
            </div>
            {!owner ? (
              <div className="bg-gray-900 rounded-xl p-6 text-center">
                <p className="text-gray-500 text-sm">No owners registered</p>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800 text-gray-400">
                    <tr>
                      <th className="text-left px-4 py-2.5">Name</th>
                      <th className="text-left px-4 py-2.5">Business</th>
                      <th className="text-left px-4 py-2.5">City</th>
                      <th className="text-left px-4 py-2.5">UPI</th>
                      <th className="text-right px-4 py-2.5">Vehicles</th>
                      <th className="text-right px-4 py-2.5">Drivers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    <tr className="hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium">{owner.fullName || "—"}</td>
                      <td className="px-4 py-3 text-gray-400">{owner.businessName || "—"}</td>
                      <td className="px-4 py-3 text-gray-400">{owner.city || "—"}</td>
                      <td className="px-4 py-3 text-gray-400">{owner.upiId || "—"}</td>
                      <td className="px-4 py-3 text-right text-gray-200">{vehicles.length}</td>
                      <td className="px-4 py-3 text-right text-gray-200">{drivers.length}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "Vehicles" && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-300">All Vehicles ({vehicles.length})</p>
              {vehicles.length > 0 && (
                <button onClick={() => downloadCsv(vehicles.map((v) => ({ ...v, fillCount: fillsByVehicle[v.id] || 0 })), "vehicles")} className="bg-accent/20 text-accent text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-accent/30 transition-colors">
                  Export CSV
                </button>
              )}
            </div>
            {vehicles.length === 0 ? (
              <div className="bg-gray-900 rounded-xl p-6 text-center">
                <p className="text-gray-500 text-sm">No vehicles added</p>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800 text-gray-400">
                    <tr>
                      <th className="text-left px-4 py-2.5">Reg No</th>
                      <th className="text-left px-4 py-2.5">Make/Model</th>
                      <th className="text-left px-4 py-2.5">Fuel</th>
                      <th className="text-left px-4 py-2.5">RC Front</th>
                      <th className="text-left px-4 py-2.5">RC Back</th>
                      <th className="text-right px-4 py-2.5">Fills</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {vehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium">{v.regNo}</td>
                        <td className="px-4 py-3 text-gray-400">{v.make || "—"}</td>
                        <td className="px-4 py-3 text-gray-400">{v.fuelType || "—"}</td>
                        <td className="px-4 py-3">
                          {v.rcFrontPhoto ? (
                            <button onClick={() => setPreviewImg(v.rcFrontPhoto)} className="text-accent hover:underline">View</button>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {v.rcBackPhoto ? (
                            <button onClick={() => setPreviewImg(v.rcBackPhoto)} className="text-accent hover:underline">View</button>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-200">{fillsByVehicle[v.id] || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "Drivers" && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-300">All Drivers ({drivers.length})</p>
              {drivers.length > 0 && (
                <button onClick={() => downloadCsv(drivers, "drivers")} className="bg-accent/20 text-accent text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-accent/30 transition-colors">
                  Export CSV
                </button>
              )}
            </div>
            {drivers.length === 0 ? (
              <div className="bg-gray-900 rounded-xl p-6 text-center">
                <p className="text-gray-500 text-sm">No drivers added</p>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800 text-gray-400">
                    <tr>
                      <th className="text-left px-4 py-2.5">Name</th>
                      <th className="text-left px-4 py-2.5">Mobile</th>
                      <th className="text-left px-4 py-2.5">License</th>
                      <th className="text-left px-4 py-2.5">Vehicle</th>
                      <th className="text-left px-4 py-2.5">Driver Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {drivers.map((d) => {
                      const veh = vehicles.find((v) => v.id === d.vehicleId);
                      return (
                        <tr key={d.id} className="hover:bg-gray-800/50">
                          <td className="px-4 py-3 font-medium">{d.name}</td>
                          <td className="px-4 py-3 text-gray-400">{d.mobile}</td>
                          <td className="px-4 py-3 text-gray-400">{d.license}</td>
                          <td className="px-4 py-3 text-gray-400">{veh?.regNo || "—"}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-accent">{d.driverCode}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "Fills" && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-300">All Fill Records ({fills.length})</p>
              {fills.length > 0 && (
                <button onClick={() => downloadCsv(fills.map((f) => ({
                  id: f.id, vehicle: f.regNo, driver: f.driver, date: f.date, time: f.time,
                  kg: f.kg, rs: f.rs, station: f.station, odometer: f.odometer,
                  locationStatus: f.locationStatus, mismatchDistance: f.mismatchDistance,
                  timeGapMin: f.timeGapMin, stationLat: f.stationCoords?.lat, stationLng: f.stationCoords?.lng,
                  odometerLat: f.odometerCoords?.lat, odometerLng: f.odometerCoords?.lng,
                })), "fills")} className="bg-accent/20 text-accent text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-accent/30 transition-colors">
                  Export CSV
                </button>
              )}
            </div>
            {fills.length === 0 ? (
              <div className="bg-gray-900 rounded-xl p-6 text-center">
                <p className="text-gray-500 text-sm">No fill records yet</p>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800 text-gray-400">
                    <tr>
                      <th className="text-left px-3 py-2.5">Vehicle</th>
                      <th className="text-left px-3 py-2.5">Date</th>
                      <th className="text-right px-3 py-2.5">KG</th>
                      <th className="text-right px-3 py-2.5">Rs</th>
                      <th className="text-left px-3 py-2.5">Station</th>
                      <th className="text-left px-3 py-2.5">Status</th>
                      <th className="text-center px-3 py-2.5">Photos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {fills.map((f) => (
                      <tr key={f.id} className="hover:bg-gray-800/50">
                        <td className="px-3 py-2.5 font-medium">{f.regNo || "—"}</td>
                        <td className="px-3 py-2.5 text-gray-400">{f.date}</td>
                        <td className="px-3 py-2.5 text-right text-gray-200">{f.kg}</td>
                        <td className="px-3 py-2.5 text-right text-gray-200">{f.rs}</td>
                        <td className="px-3 py-2.5 text-gray-400 truncate max-w-[100px]">{f.station || "—"}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            f.locationStatus === "matched" ? "bg-green-900 text-green-300" :
                            f.locationStatus === "mismatch" ? "bg-yellow-900 text-yellow-300" :
                            "bg-gray-700 text-gray-400"
                          }`}>{f.locationStatus}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {(f.photos?.pumpMeter || f.photos?.receipt || f.photos?.odometer) ? (
                            <div className="flex justify-center gap-1">
                              {f.photos?.pumpMeter && (
                                <button onClick={() => setPreviewImg(f.photos.pumpMeter)} className="w-6 h-6 bg-gray-700 rounded flex items-center justify-center hover:bg-gray-600" title="Pump Meter">
                                  <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </button>
                              )}
                              {f.photos?.receipt && (
                                <button onClick={() => setPreviewImg(f.photos.receipt)} className="w-6 h-6 bg-gray-700 rounded flex items-center justify-center hover:bg-gray-600" title="Receipt">
                                  <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </button>
                              )}
                              {f.photos?.odometer && (
                                <button onClick={() => setPreviewImg(f.photos.odometer)} className="w-6 h-6 bg-gray-700 rounded flex items-center justify-center hover:bg-gray-600" title="Odometer">
                                  <svg className="w-3 h-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </button>
                              )}
                            </div>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "Media" && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-300">All Media ({allMedia.length})</p>
              <p className="text-gray-500 text-[10px]">Tap to view full size</p>
            </div>
            {allMedia.length === 0 ? (
              <div className="bg-gray-900 rounded-xl p-6 text-center">
                <p className="text-gray-500 text-sm">No media uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {allMedia.map((m, i) => (
                  <button key={i} onClick={() => setPreviewImg(m.src)} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-accent/50 transition-colors text-left">
                    <div className="aspect-square bg-gray-800 relative">
                      <img src={m.src} alt={m.type} className="w-full h-full object-cover" />
                      <span className="absolute top-1.5 left-1.5 text-[10px] font-semibold bg-black/70 text-white px-1.5 py-0.5 rounded">{m.type}</span>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-300 truncate">{m.fill.regNo || "—"}</p>
                      <p className="text-[10px] text-gray-500">{m.fill.date}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
        <div className="max-w-5xl mx-auto flex overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 min-w-[60px] py-3 text-xs font-semibold transition-colors ${
                tab === t ? "text-accent border-t-2 border-accent bg-gray-800/50" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
