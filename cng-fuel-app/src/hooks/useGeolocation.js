import { useState, useCallback } from "react";

export default function useGeolocation() {
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = useCallback(() => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        const msg = "Geolocation not available";
        setError(msg);
        resolve(null);
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(coords);
          setLoading(false);
          resolve(coords);
        },
        (err) => {
          setLoading(false);
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionDenied(true);
            setError("Location permission denied");
          } else {
            setError(err.message);
          }
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }, []);

  return { location, error, loading, permissionDenied, requestLocation };
}
