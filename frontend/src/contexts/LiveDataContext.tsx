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
}

const LiveDataContext = createContext<LiveDataContextType | undefined>(undefined);

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
      const data = await fetch('/api/notifications').then(r => r.json());
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (_) {}
  };

  const refreshResources = useCallback(async () => {
    try {
      const data = await fetch('/api/occupancy').then(r => r.json());
      if (data.resources) setResources(data.resources);
    } catch (_) {}
  }, []);

  useEffect(() => {
    // Load initial state
    refreshResources();
    loadInitialNotifications();

    // Connect to SSE stream
    const es = new EventSource('/api/stream');
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
          // Partial update
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
          loadInitialNotifications(); // reload notifications
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
    <LiveDataContext.Provider value={{ resources, notifications, unreadCount, isConnected, isSurgeActive, lastUpdate, refreshResources }}>
      {children}
    </LiveDataContext.Provider>
  );
};

export const useLiveData = () => {
  const ctx = useContext(LiveDataContext);
  if (!ctx) throw new Error('useLiveData must be used within LiveDataProvider');
  return ctx;
};
