import { useEffect, useRef, useState, useCallback } from "react";
import { API_CONFIG } from "@/config/api";
import { RealtimeDashboardData, ConnectionStatus } from "@/types/realtime";
import api from "@/lib/api";

export const useRealtimeDashboard = () => {
  const [data, setData] = useState<RealtimeDashboardData | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const connect = useCallback(async () => {
    try {
      setStatus("connecting");

      // Get a short-lived WS token via normal HTTP (cookie auth)
      const { data: tokenData } = await api.post(API_CONFIG.endpoints.dashboard.wsToken);
      const wsToken = tokenData.token;

      const wsUrl = `${API_CONFIG.wsBase}${API_CONFIG.endpoints.dashboard.ws}?token=${wsToken}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setData(payload);
        } catch {
          console.error("Failed to parse WebSocket message");
        }
      };

      ws.onerror = () => {
        setStatus("error");
      };

      ws.onclose = () => {
        setStatus("disconnected");
        wsRef.current = null;

        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const ping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ping" }));
    }
  }, []);

  return { data, status, ping };
};