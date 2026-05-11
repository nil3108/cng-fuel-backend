const DEFAULT = window.location.port === "5173" ? "http://localhost:3001" : "https://web-production-e466.up.railway.app";
export const API_URL = window.API_URL || DEFAULT;
if (!window.API_URL) window.API_URL = DEFAULT;

export function normalizeUrl(url) {
  return (url || "").replace(/\/+$/, "");
}

export function setApiUrl(url) {
  window.API_URL = normalizeUrl(url);
}

// Normalize any pre-existing value
window.API_URL = normalizeUrl(window.API_URL);
