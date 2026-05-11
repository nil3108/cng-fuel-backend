import { useState, useMemo } from "react";

const LABELS = ["fillingVideo", "pumpMeter", "receipt", "odometer"];

export default function PhotoViewer({ photos }) {
  const [viewer, setViewer] = useState(null);

  const photoMap = useMemo(() => {
    if (!photos) return null;
    if (Array.isArray(photos)) {
      return { fillingVideo: photos[0] || null, pumpMeter: photos[1] || null, receipt: photos[2] || null, odometer: photos[3] || null };
    }
    return photos;
  }, [photos]);

  if (!photoMap) return null;

  const items = [
    { key: "fillingVideo", label: "Filling Video", color: "border-red-500", isVideo: true },
    { key: "pumpMeter", label: "Pump Meter", color: "border-blue-500" },
    { key: "receipt", label: "Receipt", color: "border-purple-500" },
    { key: "odometer", label: "Odometer", color: "border-green-500" },
  ];

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => photoMap[item.key] && setViewer({ src: photoMap[item.key], label: item.label, isVideo: item.isVideo })}
            className="relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition-all focus:outline-none"
          >
            {photoMap[item.key] ? (
              item.isVideo ? (
                <div className="w-full h-full bg-black/10 flex flex-col items-center justify-center">
                  <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  <span className="text-ink/50 text-[9px] mt-1">Video</span>
                </div>
              ) : (
                <img
                  src={photoMap[item.key]}
                  alt={item.label}
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <div className="w-full h-full bg-black/5 flex items-center justify-center">
                <span className="text-xs text-silver/50">No photo</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/60 to-transparent px-2 pb-1.5 pt-4">
              <span className="text-ink text-[10px] font-semibold">{item.label}</span>
            </div>
          </button>
        ))}
      </div>

      {viewer && (
        <div
          className="fixed inset-0 z-[100] bg-ink/90 flex flex-col items-center justify-center"
          onClick={() => setViewer(null)}
        >
          <button
            onClick={() => setViewer(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <p className="text-white text-sm font-semibold mb-4">{viewer.label}</p>
          {viewer.isVideo ? (
            <video
              src={viewer.src}
              controls
              autoPlay
              className="max-w-[90vw] max-h-[70vh] rounded-2xl shadow-2xl object-contain"
            />
          ) : (
            <img
              src={viewer.src}
              alt={viewer.label}
              className="max-w-[90vw] max-h-[70vh] rounded-2xl shadow-2xl object-contain"
            />
          )}
          <p className="text-white/50 text-xs mt-4">Tap anywhere to close</p>
        </div>
      )}
    </>
  );
}
