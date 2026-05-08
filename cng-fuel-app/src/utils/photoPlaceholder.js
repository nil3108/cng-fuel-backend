const COLORS = {
  pumpMeter: { bg: "#2563EB", label: "PUMP METER" },
  receipt: { bg: "#7C3AED", label: "RECEIPT" },
  odometer: { bg: "#059669", label: "ODOMETER" },
};

export function generatePhotoDataUri(type, index = 0) {
  const c = COLORS[type] || { bg: "#6B7280", label: "PHOTO" };
  const lighter = c.bg + "99";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
    <rect width="320" height="240" fill="${c.bg}" rx="8"/>
    <rect x="0" y="0" width="320" height="240" fill="url(#g)" rx="8" opacity="0.3"/>
    <defs>
      <radialGradient id="g" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stop-color="white" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="160" cy="80" r="40" fill="none" stroke="white" stroke-width="3" opacity="0.5"/>
    <circle cx="160" cy="80" r="12" fill="white" opacity="0.4"/>
    <text x="160" y="170" text-anchor="middle" fill="white" font-family="monospace" font-size="18" font-weight="bold" opacity="0.9">${c.label}</text>
    <text x="160" y="195" text-anchor="middle" fill="white" font-family="monospace" font-size="11" opacity="0.6">#${index + 1} · ${new Date().toLocaleDateString()}</text>
    <rect x="8" y="8" width="20" height="20" rx="4" fill="white" opacity="0.2"/>
    <circle cx="18" cy="18" r="4" fill="white" opacity="0.4"/>
  </svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

function compressImage(dataUrl, maxW = 800, quality = 0.5) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxW / img.width, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch { resolve(dataUrl); }
  });
}

export function readFileAsDataURL(file) {
  return new Promise((resolve) => {
    if (!file) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const compressed = await compressImage(reader.result);
      resolve(compressed);
    };
    reader.onerror = () => resolve(generatePhotoDataUri("receipt"));
    reader.readAsDataURL(file);
  });
}

export const MOCK_PHOTOS = {
  pumpMeter: [
    generatePhotoDataUri("pumpMeter", 0),
    generatePhotoDataUri("pumpMeter", 1),
    generatePhotoDataUri("pumpMeter", 2),
  ],
  receipt: [
    generatePhotoDataUri("receipt", 0),
    generatePhotoDataUri("receipt", 1),
    generatePhotoDataUri("receipt", 2),
  ],
  odometer: [
    generatePhotoDataUri("odometer", 0),
    generatePhotoDataUri("odometer", 1),
    generatePhotoDataUri("odometer", 2),
  ],
};
