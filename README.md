# 🏛️ CAMPUSPULSE AI
> **"Smart Campus Resource Finder & Crowd Predictor"**  
> *Tagline: "Find. Predict. Optimize. — Your Campus, Smarter."*

Built for Hackathon Theme: **Smart Campus & IoT Simulation**

---

## ⚡ What is CampusPulse AI?

Students waste hours physically checking libraries, computer labs, classrooms, and study rooms to find quiet spaces. During peak hours, facilities become overcrowded while others sit underutilized.

**CampusPulse AI** is a futuristic **Smart Campus Digital Twin & IoT Command Center** that brings real-time visibility, ML predictive forecasting, and intelligent resource recommendations to campus facilities.

```
IoT Sensor Simulation (Entry/Exit streams)
                ↓
    Current Occupancy Monitoring
                ↓
    Campus Digital Twin (Interactive Map)
                ↓
    Live Crowd Heatmap (Intensity Visualization)
                ↓
  AI Multi-Horizon Crowd Prediction (+30m, +1h, +2h, +4h)
                ↓
    Smart Recommendation Engine (Scored Best-Match)
                ↓
    Quick Booking & Smart Notifications
                ↓
    Admin Optimization & Sensor Control Center
```

---

## 🚀 Key Features

### 👨‍🎓 Student Experience
1. **Interactive Digital Twin Map**: Leaflet.js campus map with color-coded markers (Quiet 🟢, Moderate 🟡, Crowded 🔴) across 15 campus locations.
2. **Live Crowd Heatmap**: Real-time visual density heatmap displaying live occupancy across all campus zones.
3. **AI Crowd Prediction**: Multi-horizon forecasting (+30 min, +1 hr, +2 hr, +4 hr) powered by Gradient Boosting Regressor ML models trained on historical campus trends.
4. **Smart Resource Finder**: Match-scoring wizard that recommends the optimal study/lab space based on your required seats, max crowd tolerance, and walking distance.
5. **One-Tap Space Booking**: Reserve available seats with real-time confirmation codes and cancellation management.
6. **Smart Alerts**: Live notifications for peak surges, quiet space availability, and upcoming reservations.

### 🛡️ Admin Command Center
1. **Live Campus Monitoring**: Real-time digital twin monitoring of all 15 resources.
2. **IoT Sensor Control Center**: Live entry/exit sensor rates, simulate manual entries/exits, pause/resume sensors, and track hardware health.
3. **Demo Simulation Engine**: Adjustable speed (Slow / Normal / Fast), one-click **Demo Surge Trigger**, and state reset for hackathon demos.
4. **Crowd & Utilization Analytics**: Hourly occupancy area charts, weekly day-by-day distribution, peak activity windows, and category-level utilization.
5. **AI Campus Insights**: Automated anomaly detection, peak warnings, and optimization insights.
6. **Resource Management**: Full CRUD management of campus facilities.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Framer Motion, React Leaflet, Recharts
- **Backend**: Node.js, Express.js, TypeScript, Server-Sent Events (SSE) for real-time live data stream
- **Database**: Prisma ORM, SQLite (`dev.db` with full seed data)
- **AI / ML**: Python 3, Scikit-learn (GradientBoostingRegressor), Pandas, NumPy, analytical prediction fallback engine
- **Authentication**: JWT, bcrypt

---

## 👥 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Student** | `student@campus.ai` | `student123` |
| **Admin** | `admin@campus.ai` | `admin123` |

---

## 🏃 Quick Start Guide

### 1. Clone & Install
```bash
git clone https://github.com/gautham-code505/OCCUPRA1.git
cd OCCUPRA1
```

### 2. Backend Setup
```bash
cd backend
npm install
npx prisma db push
npx tsx src/prisma/seed.ts
npm run dev
# Backend runs on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### 4. ML Models (Optional - Pretrained models included)
```bash
cd ../ml/prediction
python training/train_model.py
# Models saved to ml/prediction/model/
```

---

## 📁 Project Structure

```
smartcampus/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema (User, Resource, Sensor, Booking, etc.)
│   │   └── seed.ts             # Complete seed data for 15 campus locations
│   └── src/
│       ├── controllers/        # 10 Express controllers
│       ├── services/           # Prediction & recommendation engines
│       ├── simulation/         # IoT simulation stream engine
│       ├── routes/             # REST API endpoints
│       └── index.ts            # Server entry with SSE /api/stream
├── frontend/
│   ├── src/
│   │   ├── components/         # Map, detail panels, sidebar, topbar, core UI
│   │   ├── contexts/           # AuthContext & LiveDataContext (SSE stream)
│   │   ├── pages/              # Student & Admin pages (12+ complete views)
│   │   └── services/           # API & SSE services
├── ml/
│   └── prediction/
│       ├── data/               # Historical campus dataset generator
│       ├── training/           # GradientBoostingRegressor model trainer
│       └── model/              # 4 trained models (+30m, +1h, +2h, +4h)
└── README.md
```

---

## 🏆 Hackathon Highlights
- **Realistic IoT Simulation**: Non-random diurnal velocity algorithm mimicking natural class transitions, lunch peaks, and study habits.
- **Glassmorphism Cyber Aesthetic**: Clean futuristic UI inspired by smart-city digital twins and mission control rooms.
- **Fault-Tolerant Realtime Sync**: SSE stream provides smooth live updates without WebSocket handshake latency.
