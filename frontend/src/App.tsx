import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LiveDataProvider } from './contexts/LiveDataContext';
import { RequireAuth } from './components/auth/RequireAuth';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { CampusMapPage } from './pages/CampusMapPage';
import { HeatmapPage } from './pages/HeatmapPage';
import { CrowdPredictionPage } from './pages/CrowdPredictionPage';
import { RecommendationPage } from './pages/RecommendationPage';
import { BookingsPage } from './pages/BookingsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { IoTSensorPage } from './pages/IoTSensorPage';
import { CrowdAnalyticsPage } from './pages/CrowdAnalyticsPage';
import { ResourceUtilizationPage } from './pages/ResourceUtilizationPage';
import { AIInsightsPage } from './pages/AIInsightsPage';
import { ResourceManagementPage } from './pages/ResourceManagementPage';
import { BookingManagementPage } from './pages/BookingManagementPage';
import { LiveCampusMonitoringPage } from './pages/LiveCampusMonitoringPage';
import { PredictionAnalyticsPage } from './pages/PredictionAnalyticsPage';
import { SystemSettingsPage } from './pages/SystemSettingsPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LiveDataProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Student routes */}
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<StudentDashboard />} />
                <Route path="/map" element={<CampusMapPage />} />
                <Route path="/heatmap" element={<HeatmapPage />} />
                <Route path="/prediction" element={<CrowdPredictionPage />} />
                <Route path="/recommendation" element={<RecommendationPage />} />
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Admin routes */}
            <Route element={<RequireAuth adminOnly />}>
              <Route element={<AppLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/monitoring" element={<LiveCampusMonitoringPage />} />
                <Route path="/admin/sensors" element={<IoTSensorPage />} />
                <Route path="/admin/resources" element={<ResourceManagementPage />} />
                <Route path="/admin/analytics" element={<CrowdAnalyticsPage />} />
                <Route path="/admin/predictions" element={<PredictionAnalyticsPage />} />
                <Route path="/admin/utilization" element={<ResourceUtilizationPage />} />
                <Route path="/admin/insights" element={<AIInsightsPage />} />
                <Route path="/admin/bookings" element={<BookingManagementPage />} />
                <Route path="/admin/settings" element={<SystemSettingsPage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </LiveDataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
