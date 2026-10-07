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

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Framer Motion, Leaflet.js, Recharts |
| **Full-Stack Server** | Node.js, Express.js, TypeScript, Server-Sent Events (SSE) live data stream |
| **Python Backend / Microservices** | Python 3, FastAPI, Uvicorn, WebSockets, Firebase Admin SDK & In-Memory fallback |
| **Database & ORM** | Prisma ORM, SQLite (`dev.db` with full seed data) & Firestore repository pattern |
| **Machine Learning** | Scikit-learn (GradientBoostingRegressor), XGBoost, Pandas, NumPy |
| **Authentication** | JWT, bcrypt, Role-based Access Control (Student / Admin) |

---

## 👥 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Student** | `student@campus.ai` | `student123` |
| **Admin** | `admin@campus.ai` | `admin123` |

---

## 🏃 Quick Start Guide

### 1. Clone
```bash
git clone https://github.com/gautham-code505/OCCUPRA1.git
cd OCCUPRA1
```

### 2. Frontend (React + Vite + Tailwind)
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:5173
```

### 3. Full-Stack Node.js & SSE Backend
```bash
cd backend
npm install
npx prisma db push
npx tsx src/prisma/seed.ts
npm run dev
# Running on http://localhost:5000
```

### 4. Optional: Python FastAPI Backend & ML Pipeline
```bash
cd backend
pip install -r requirements.txt
python run.py
# Running on http://localhost:8000 (Swagger docs at /docs)
```

---

## 📁 Project Structure

```
OCCUPRA1/
├── frontend/                   # Futuristic React UI
│   ├── src/
│   │   ├── components/         # Leaflet Map, detail panel, layout, core UI
│   │   ├── contexts/           # AuthContext & LiveDataContext (SSE stream)
│   │   ├── pages/              # 12+ student and admin dashboard views
│   │   └── services/           # API and SSE client services
├── backend/                    # Dual-capable Backend Architecture
│   ├── src/                    # TypeScript Express + SSE Simulation Engine
│   │   ├── controllers/        # 10 API controllers
│   │   ├── services/           # Prediction & recommendation engines
│   │   ├── simulation/         # IoT simulation stream engine
│   │   └── prisma/             # Prisma schema & seed data
│   └── app/                    # Python FastAPI service
│       ├── api/                # FastAPI routers
│       ├── ml/                 # XGBoost / Scikit-learn model trainer & evaluator
│       └── simulation/         # Python virtual IoT simulation
├── ml/                         # Standalone ML Training Pipeline
│   └── prediction/
│       ├── data/               # Historical campus dataset generator
│       ├── training/           # GradientBoostingRegressor trainer
│       └── model/              # Serialized model artifacts (.joblib)
└── README.md
```

---

## 🏆 Hackathon Highlights
- **Realistic IoT Simulation**: Non-random diurnal velocity algorithm mimicking natural class transitions, lunch peaks, and study habits.
- **Glassmorphism Cyber Aesthetic**: Clean futuristic UI inspired by smart-city digital twins and mission control rooms.
- **Fault-Tolerant Realtime Sync**: SSE stream provides smooth live updates without WebSocket handshake latency.
- **Multi-Horizon ML Forecasting**: Predicts occupancy at 30m, 1h, 2h, and 4h horizons with high confidence.
