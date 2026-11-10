// Central API base configuration
const envUrl = import.meta.env.VITE_API_URL;
const BASE_URL = envUrl 
  ? (envUrl.replace(/\/$/, '').endsWith('/api') ? envUrl.replace(/\/$/, '') : envUrl.replace(/\/$/, '') + '/api')
  : '/api';

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

  register: (data: { email: string; password: string; name: string; department?: string; phoneNo?: string; rollNo?: string; role?: string }) =>
    fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  getMe: () =>
    fetch(`${BASE_URL}/auth/me`, { headers: getHeaders() }).then(handleResponse),
  updateMe: (data: { name?: string; department?: string; phoneNo?: string; rollNo?: string }) =>
    fetch(`${BASE_URL}/auth/me`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
  changePassword: (currentPassword: string, newPassword: string) =>
    fetch(`${BASE_URL}/auth/password`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ currentPassword, newPassword }) }).then(handleResponse),
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

// CAMPUS INTELLIGENCE (timetable, demo clock, energy, what-if, agent, WiFi)
const post = (path: string, body?: any) =>
  fetch(`${BASE_URL}${path}`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body ?? {}) }).then(handleResponse);

export const campusAPI = {
  getTimetable: (day?: number) =>
    fetch(`${BASE_URL}/campus/timetable${day !== undefined ? `?day=${day}` : ''}`, { headers: getHeaders() }).then(handleResponse),
  getClock: () => fetch(`${BASE_URL}/campus/clock`, { headers: getHeaders() }).then(handleResponse),
  setClock: (body: { day?: number; time?: string; rate?: number; mode?: 'real' }) => post('/simulation/clock', body),
  getEnergy: (params?: { day?: number; tariff?: number; co2?: number }) => {
    const q = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    return fetch(`${BASE_URL}/campus/energy?${q}`, { headers: getHeaders() }).then(handleResponse);
  },
  applyEnergy: (resourceId: string, open: boolean) => post('/campus/energy/apply', { resourceId, open }),
  whatIf: (body: { type: 'shift_slot' | 'stagger' | 'attendance'; day?: number; slotStart?: string; minutes?: number; factor?: number }) =>
    post('/campus/whatif', body),
  plan: (message: string, lang?: string) => post('/campus/agent/plan', { message, lang }),
  transcribe: (audio: Blob, lang: string) => {
    const token = localStorage.getItem('campuspulse_token');
    return fetch(`${BASE_URL}/campus/agent/transcribe?lang=${encodeURIComponent(lang)}`, {
      method: 'POST',
      headers: { 'Content-Type': audio.type || 'audio/webm', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: audio,
    }).then(handleResponse);
  },
  checkPlan: (steps: any[]) => post('/campus/agent/check', { steps }),
  getWifi: () => fetch(`${BASE_URL}/campus/wifi`, { headers: getHeaders() }).then(handleResponse),
  getModelInfo: () => fetch(`${BASE_URL}/predictions/model-info`, { headers: getHeaders() }).then(handleResponse),
};
