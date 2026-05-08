import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function createIcon(color, label) {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;"><div style="background:${color};width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div><span style="position:absolute;top:-18px;font-size:10px;font-weight:700;color:#333;white-space:nowrap;background:rgba(255,255,255,0.9);padding:0 4px;border-radius:4px;">${label}</span></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

const stationIcon = createIcon("#E30613", "Station");
const odometerIcon = createIcon("#CC0511", "Odometer");

function FitBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [map, coords]);
  return null;
}

export default function LocationMap({ stationCoords, odometerCoords, height = 220 }) {
  const points = [];
  if (stationCoords) points.push([stationCoords.lat, stationCoords.lng]);
  if (odometerCoords) points.push([odometerCoords.lat, odometerCoords.lng]);

  if (points.length === 0) return null;

  const center = points.length === 1 ? points[0] : [
    (points[0][0] + points[1][0]) / 2,
    (points[0][1] + points[1][1]) / 2,
  ];

  const openInMaps = () => {
    if (stationCoords && odometerCoords) {
      window.open(`https://www.google.com/maps/dir/${stationCoords.lat},${stationCoords.lng}/${odometerCoords.lat},${odometerCoords.lng}`, "_blank");
    } else if (stationCoords) {
      window.open(`https://www.google.com/maps?q=${stationCoords.lat},${stationCoords.lng}`, "_blank");
    } else if (odometerCoords) {
      window.open(`https://www.google.com/maps?q=${odometerCoords.lat},${odometerCoords.lng}`, "_blank");
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-black/10 relative" style={{ height }}>
      <div className="absolute top-2 right-2 z-[1000] flex gap-1">
        {stationCoords && (
          <button
            onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps?q=${stationCoords.lat},${stationCoords.lng}`, "_blank"); }}
            className="bg-black/10 backdrop-blur-sm text-[10px] font-semibold text-ink px-2 py-1 rounded-full shadow hover:bg-black/20 transition-colors"
            title="Open station location"
          >
            Station
          </button>
        )}
        {odometerCoords && (
          <button
            onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps?q=${odometerCoords.lat},${odometerCoords.lng}`, "_blank"); }}
            className="bg-black/10 backdrop-blur-sm text-[10px] font-semibold text-accent px-2 py-1 rounded-full shadow hover:bg-black/20 transition-colors"
            title="Open odometer photo location"
          >
            Odometer
          </button>
        )}
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000]">
        <button
          onClick={openInMaps}
          className="bg-accent text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg hover:bg-accent/90 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Open in Maps
        </button>
      </div>
      <MapContainer
        center={center}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds coords={points} />
        {stationCoords && (
          <Marker position={[stationCoords.lat, stationCoords.lng]} icon={stationIcon}>
            <Popup>
              <div className="text-center">
                <p className="text-xs font-medium mb-1">CNG Station</p>
                <button
                  onClick={() => window.open(`https://www.google.com/maps?q=${stationCoords.lat},${stationCoords.lng}`, "_blank")}
                  className="text-[10px] bg-accent text-white px-2 py-0.5 rounded"
                >
                  Open in Maps
                </button>
              </div>
            </Popup>
          </Marker>
        )}
        {odometerCoords && (
          <Marker position={[odometerCoords.lat, odometerCoords.lng]} icon={odometerIcon}>
            <Popup>
              <div className="text-center">
                <p className="text-xs font-medium mb-1">Odometer Photo</p>
                <button
                  onClick={() => window.open(`https://www.google.com/maps?q=${odometerCoords.lat},${odometerCoords.lng}`, "_blank")}
                  className="text-[10px] bg-accent text-white px-2 py-0.5 rounded"
                >
                  Open in Maps
                </button>
              </div>
            </Popup>
          </Marker>
        )}
        {stationCoords && odometerCoords && (
          <Polyline
            positions={[
              [stationCoords.lat, stationCoords.lng],
              [odometerCoords.lat, odometerCoords.lng],
            ]}
            color="#E30613"
            weight={2}
            dashArray="6 4"
          />
        )}
      </MapContainer>
    </div>
  );
}
