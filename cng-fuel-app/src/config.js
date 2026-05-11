const DEFAULT = window.location.port === "5173" ? "http://localhost:3001" : "https://web-production-e466.up.railway.app";
export const API_URL = window.API_URL || DEFAULT;
if (!window.API_URL) window.API_URL = DEFAULT;

export function setApiUrl(url) {
  window.API_URL = url;
}
