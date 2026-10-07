// Central API base configuration
const BASE_URL = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('campuspulse_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

// AUTH
export const authAPI = {
  login: (email: string, password: string) =>
    fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),

  register: (data: { email: string; password: string; name: string; department?: string }) =>
    fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  getMe: () =>
    fetch(`${BASE_URL}/auth/me`, { headers: getHeaders() }).then(handleResponse),
};

// RESOURCES
export const resourceAPI = {
  getAll: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetch(`${BASE_URL}/resources${q}`, { headers: getHeaders() }).then(handleResponse);
  },
  getById: (id: string) =>
    fetch(`${BASE_URL}/resources/${id}`, { headers: getHeaders() }).then(handleResponse),
  create: (data: any) =>
    fetch(`${BASE_URL}/resources`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
  update: (id: string, data: any) =>
    fetch(`${BASE_URL}/resources/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
  delete: (id: string) =>
    fetch(`${BASE_URL}/resources/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
};

// OCCUPANCY
export const occupancyAPI = {
  getOverview: () =>
    fetch(`${BASE_URL}/occupancy`, { headers: getHeaders() }).then(handleResponse),
  getByResource: (resourceId: string) =>
    fetch(`${BASE_URL}/occupancy/${resourceId}`, { headers: getHeaders() }).then(handleResponse),
};

// PREDICTIONS
export const predictionAPI = {
  getForResource: (resourceId: string) =>
    fetch(`${BASE_URL}/predictions/${resourceId}`, { headers: getHeaders() }).then(handleResponse),
  getOverview: () =>
    fetch(`${BASE_URL}/predictions/overview`, { headers: getHeaders() }).then(handleResponse),
};

// RECOMMENDATIONS
export const recommendationAPI = {
  get: (payload: { need: string; requiredSeats?: number; maxCrowd?: number; maxDistance?: number }) =>
    fetch(`${BASE_URL}/recommendations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse),
};

// BOOKINGS
export const bookingAPI = {
  getAll: () =>
    fetch(`${BASE_URL}/bookings`, { headers: getHeaders() }).then(handleResponse),
  getMy: () =>
    fetch(`${BASE_URL}/bookings/my`, { headers: getHeaders() }).then(handleResponse),
  create: (data: any) =>
    fetch(`${BASE_URL}/bookings`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
  cancel: (id: string) =>
    fetch(`${BASE_URL}/bookings/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
};

// NOTIFICATIONS
export const notificationAPI = {
  getAll: () =>
    fetch(`${BASE_URL}/notifications`, { headers: getHeaders() }).then(handleResponse),
  markRead: (id: string) =>
    fetch(`${BASE_URL}/notifications/${id}/read`, { method: 'PUT', headers: getHeaders() }).then(handleResponse),
  markAllRead: () =>
    fetch(`${BASE_URL}/notifications/read-all`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
};

// SENSORS
export const sensorAPI = {
  getAll: () =>
    fetch(`${BASE_URL}/sensors`, { headers: getHeaders() }).then(handleResponse),
  simulateEntry: (id: string, count?: number) =>
    fetch(`${BASE_URL}/sensors/${id}/simulate-entry`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ count }) }).then(handleResponse),
  simulateExit: (id: string, count?: number) =>
    fetch(`${BASE_URL}/sensors/${id}/simulate-exit`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ count }) }).then(handleResponse),
  toggleStatus: (id: string) =>
    fetch(`${BASE_URL}/sensors/${id}/toggle-status`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
};

// ANALYTICS
export const analyticsAPI = {
  getOverview: () =>
    fetch(`${BASE_URL}/analytics/overview`, { headers: getHeaders() }).then(handleResponse),
  getUtilization: () =>
    fetch(`${BASE_URL}/analytics/utilization`, { headers: getHeaders() }).then(handleResponse),
  getTrends: () =>
    fetch(`${BASE_URL}/analytics/trends`, { headers: getHeaders() }).then(handleResponse),
  getInsights: () =>
    fetch(`${BASE_URL}/analytics/insights`, { headers: getHeaders() }).then(handleResponse),
};

// SIMULATION CONTROL
export const simulationAPI = {
  getStatus: () =>
    fetch(`${BASE_URL}/simulation/status`, { headers: getHeaders() }).then(handleResponse),
  toggle: () =>
    fetch(`${BASE_URL}/simulation/toggle`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
  setSpeed: (speed: 'slow' | 'normal' | 'fast') =>
    fetch(`${BASE_URL}/simulation/speed`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ speed }) }).then(handleResponse),
  triggerSurge: () =>
    fetch(`${BASE_URL}/simulation/trigger-surge`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
  reset: () =>
    fetch(`${BASE_URL}/simulation/reset`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
};
