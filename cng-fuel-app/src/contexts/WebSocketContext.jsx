import { createContext, useContext, useEffect, useRef, useState } from "react";

const WebSocketContext = createContext(null);

const RECONNECT_MS = 3000;
const MAX_RECONNECTS = 10;

export function WebSocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const wsRef = useRef(null);
  const reconnectCount = useRef(0);
  const ownerPhoneRef = useRef(null);
  const listeners = useRef({});
  const manuallyClosed = useRef(false);

  function getWsUrl() {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.API_URL
      ? window.API_URL.replace(/^https?:\/\//, "")
      : window.location.host;
    return `${proto}//${host}`;
  }

  function connect() {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const url = getWsUrl();
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setConnected(true);
        reconnectCount.current = 0;
        if (ownerPhoneRef.current) {
          ws.send(JSON.stringify({ type: "register", ownerPhone: ownerPhoneRef.current }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === "sync:updated") {
            setLastUpdate(Date.now());
            Object.values(listeners.current).forEach((fn) => fn(msg.payload));
          } else if (msg.event === "registered") {
            console.log("[ws] Registered for updates:", msg.payload?.ownerPhone);
          }
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (!manuallyClosed.current && reconnectCount.current < MAX_RECONNECTS) {
          reconnectCount.current++;
          setTimeout(connect, RECONNECT_MS);
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {}
  }

  function registerOwner(phone) {
    ownerPhoneRef.current = phone;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "register", ownerPhone: phone }));
    } else if (!wsRef.current) {
      connect();
    }
  }

  function onSyncUpdate(callback) {
    const id = Math.random().toString(36).slice(2);
    listeners.current[id] = callback;
    return () => { delete listeners.current[id]; };
  }

  function disconnect() {
    manuallyClosed.current = true;
    reconnectCount.current = MAX_RECONNECTS;
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ connected, lastUpdate, registerOwner, onSyncUpdate, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
