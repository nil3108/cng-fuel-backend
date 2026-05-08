export const API_URL = window.API_URL || (window.location.port === "5173" ? "http://localhost:3001" : "");

export function setApiUrl(url) {
  window.API_URL = url;
}
