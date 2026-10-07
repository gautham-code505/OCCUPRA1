import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { Resource, Notification } from '../types';

interface LiveDataContextType {
  resources: Resource[];
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  isSurgeActive: boolean;
  lastUpdate: Date | null;
  refreshResources: () => void;
  markAllReadLocally: () => void;
  refreshNotifications: () => void;
}

const LiveDataContext = createContext<LiveDataContextType | undefined>(undefined);

// Resolve the base API URL from env or fallback to /api
const envUrl = import.meta.env.VITE_API_URL;
const API_BASE = envUrl
  ? (envUrl.replace(/\/$/, '').endsWith('/api') ? envUrl.replace(/\/$/, '') : envUrl.replace(/\/$/, '') + '/api')
  : '/api';

// SSE stream URL — same host as API
const STREAM_URL = API_BASE.replace(/\/api$/, '') + '/api/stream';

export const LiveDataProvider = ({ children }: { children: ReactNode }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isSurgeActive, setIsSurgeActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const loadInitialNotifications = async () => {
    try {
      const token = localStorage.getItem('campuspulse_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const data = await fetch(`${API_BASE}/notifications`, { headers }).then(r => r.json());
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (_) {}
  };

  const markAllReadLocally = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  const refreshNotifications = useCallback(async () => {
    await loadInitialNotifications();
  }, []);

  const refreshResources = useCallback(async () => {
    try {
      const token = localStorage.getItem('campuspulse_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const data = await fetch(`${API_BASE}/occupancy`, { headers }).then(r => r.json());
      if (data.resources) setResources(data.resources);
    } catch (_) {}
  }, []);

  useEffect(() => {
    refreshResources();
    loadInitialNotifications();

    // Connect SSE to the correct backend URL
    const es = new EventSource(STREAM_URL);
    eventSourceRef.current = es;

    es.onopen = () => setIsConnected(true);
    es.onerror = () => setIsConnected(false);

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        setLastUpdate(new Date());

        if (payload.type === 'CONNECTED') {
          setIsConnected(true);
        } else if (payload.type === 'TICK') {
          const { resources: updatedResources, surgeScenarioActive } = payload.data;
          setResources(updatedResources);
          setIsSurgeActive(surgeScenarioActive);
        } else if (payload.type === 'RESOURCE_UPDATE') {
          setResources(prev =>
            prev.map(r =>
              r.id === payload.data.resourceId
                ? { ...r, occupancyPercent: payload.data.occupancyPercent }
                : r
            )
          );
        } else if (payload.type === 'NOTIFICATION') {
          setNotifications(prev => [payload.data, ...prev]);
          setUnreadCount(prev => prev + 1);
        } else if (payload.type === 'SURGE_TRIGGERED') {
          setIsSurgeActive(true);
          loadInitialNotifications();
        } else if (payload.type === 'RESET') {
          setIsSurgeActive(false);
          refreshResources();
        }
      } catch (_) {}
    };

    return () => {
      es.close();
    };
  }, []);

  return (
    <LiveDataContext.Provider value={{ resources, notifications, unreadCount, isConnected, isSurgeActive, lastUpdate, refreshResources, markAllReadLocally, refreshNotifications }}>
      {children}
    </LiveDataContext.Provider>
  );
};

export const useLiveData = () => {
  const ctx = useContext(LiveDataContext);
  if (!ctx) throw new Error('useLiveData must be used within LiveDataProvider');
  return ctx;
};
