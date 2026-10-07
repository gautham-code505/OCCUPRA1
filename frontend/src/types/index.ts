export interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'ADMIN';
  department: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Sensor {
  id: string;
  sensorCode: string;
  resourceId: string;
  status: 'ONLINE' | 'PAUSED' | 'OFFLINE';
  entryRate: number;
  exitRate: number;
  batteryLevel: number;
  healthPercent: number;
  lastHeartbeat: string;
  resource?: Partial<Resource>;
}

export interface Resource {
  id: string;
  name: string;
  code: string;
  type: 'LIBRARY' | 'COMPUTER_LAB' | 'STUDY_ROOM' | 'CANTEEN' | 'SEMINAR_HALL' | 'CLASSROOM' | 'RESEARCH_LAB' | 'ACTIVITY_CENTER';
  capacity: number;
  currentOccupancy: number;
  occupancyPercent: number;
  availableUnits: number;
  openingTime: string;
  closingTime: string;
  facilities: string;
  description: string;
  currentCrowdStatus: 'QUIET' | 'MODERATE' | 'CROWDED';
  latitude: number;
  longitude: number;
  floor: string;
  building: string;
  distanceMeters: number;
  isAvailable: boolean;
  sensors?: Sensor[];
  predictions?: Prediction[];
  updatedAt: string;
}

export interface OccupancyRecord {
  id: string;
  resourceId: string;
  occupancy: number;
  occupancyPercent: number;
  entryCount: number;
  exitCount: number;
  timestamp: string;
}

export interface Prediction {
  id: string;
  resourceId: string;
  timeOffsetMinutes: number;
  predictedOccupancyPercent: number;
  confidence: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  summary: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  bookingCode: string;
  userId: string;
  resourceId: string;
  resource?: Resource;
  user?: Partial<User>;
  date: string;
  startTime: string;
  endTime: string;
  seats: number;
  purpose: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId?: string;
  resourceId?: string;
  resource?: Partial<Resource>;
  type: 'CROWD' | 'AVAILABILITY' | 'PREDICTION' | 'RECOMMENDATION' | 'BOOKING';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  category: 'UTILIZATION' | 'PEAK_WARNING' | 'RECOMMENDATION' | 'ANOMALY';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  resourceId?: string;
  resource?: Partial<Resource>;
  createdAt: string;
}

export interface ResourceForecast {
  resourceId: string;
  resourceName: string;
  currentOccupancyPercent: number;
  currentCrowdStatus: string;
  predictions: {
    horizon: '30m' | '1h' | '2h' | '4h';
    timeOffsetMinutes: number;
    predictedPercent: number;
    confidence: number;
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
    summary: string;
  }[];
  overallTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  interpretation: string;
}

export interface RecommendedResource {
  id: string;
  name: string;
  code: string;
  type: string;
  matchScore: number;
  currentOccupancyPercent: number;
  availableUnits: number;
  capacity: number;
  distanceMeters: number;
  currentCrowdStatus: string;
  predictedInOneHour: number;
  facilities: string;
  reasons: string[];
}

export interface CampusOverview {
  totalResources: number;
  totalCapacity: number;
  totalOccupied: number;
  campusOccupancyPercent: number;
  quietResources: number;
  moderateResources: number;
  crowdedResources: number;
  activeBookings: number;
  sensorHealthPercent: number;
  lastUpdated: string;
}

export type CrowdStatus = 'QUIET' | 'MODERATE' | 'CROWDED';
export type ResourceType = 'LIBRARY' | 'COMPUTER_LAB' | 'STUDY_ROOM' | 'CANTEEN' | 'SEMINAR_HALL' | 'CLASSROOM' | 'RESEARCH_LAB' | 'ACTIVITY_CENTER';
