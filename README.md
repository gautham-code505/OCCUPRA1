# 🏛️ OCCUPRA
> **"Smart Campus Occupancy & Resource Intelligence"**  
> *Tagline: "Find. Predict. Optimize. — Your Campus, Smarter."*

Built for Hackathon Theme: **Smart Campus & IoT Simulation**

---

## ⚡ What is OCCUPRA?

Students waste hours physically checking libraries, computer labs, classrooms, and study rooms to find quiet spaces. During peak hours, facilities become overcrowded while others sit underutilized.

**OCCUPRA** is a futuristic **Smart Campus Digital Twin & IoT Command Center** that brings real-time visibility, ML predictive forecasting, and intelligent resource recommendations to campus facilities.

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

## 🧠 Timetable-Aware Campus Intelligence (new)

> *OCCUPRA turns the campus Wi-Fi and timetable you already have into a crowd forecast — students use it to skip crowds, admins use it to cut energy waste.*

One shared engine drives every feature:

```
Wi-Fi AP counts + door sensors + class timetable (ERP)
                    ↓
     Timetable-aware ML forecast (GBM, +30m … +4h)
        ↓                  ↓                   ↓
   Students:           Admins:              Safety:
   early-peak nudges   energy & room        over-capacity
   Smart Planner       consolidation (₹/CO₂) alerts
   (Groq agent)        What-If simulator
```

| Feature | Where | What it does |
|---|---|---|
| **Timetable-aware forecast** | Crowd Prediction | Knows *when classes end and how many students leave*. Explains itself ("284 students leave class around 12:50"). |
| **Early-peak nudges** | Notifications (live) | "Main Canteen will hit 83% in ~30 min — go now, or try Student Activity Center (53%)." |
| **Smart Planner (agent)** | Student → Smart Planner | "I have 3 free hours: study, eat, print notes" → a timed plan across spaces, one-tap seat booking, and automatic re-planning if a spot gets crowded. The LLM (Groq) only parses language and writes the summary; places and times come from the forecast, so it cannot invent rooms. Works offline with a keyword parser if Groq is unavailable. |
| **Energy Optimizer** | Admin → Energy Optimizer | Switches off empty teaching rooms and consolidates under-used study rooms/labs. Shows kWh, ₹ and CO₂ saved with every assumption visible; "Close & notify students" applies it live. |
| **What-If Simulator** | Admin → What-If Simulator | "Move the 12:00 classes 30 min later" → canteen peak drops from ~95% to ~59%. Stagger departments or simulate exam-week attendance. |
| **Wi-Fi soft sensing** | Admin → IoT Sensors | Headcount from anonymous Wi-Fi client counts, calibrated per zone against door counters. No cameras, no new hardware. |
| **Demo Clock** | Admin → Command Center | Jump to any weekday/time and speed it up, so lunch rushes can be demoed at 9 pm on a Sunday. |

### Forecast accuracy (held-out simulated days, mean absolute error in % points)

| Horizon | Naive ("stays the same") | ML without timetable | **ML with timetable** | Error reduction from timetable |
|---|---|---|---|---|
| +30m | 6.07 | 4.22 | **3.15** | 25% |
| +1h | 9.2 | 5.2 | **3.5** | 33% |
| +2h | 13.85 | 5.68 | **3.8** | 33% |
| +4h | 18.18 | 4.89 | **3.59** | 27% |

The model is trained in Python (`ml/timetable/train.py`) and exported as plain decision trees to `backend/src/ml/model.json`; Node runs it natively (`scripts/verify-model.ts` checks Node and Python give identical errors). No Python is needed at runtime.

> **Honest caveat:** the training data is generated by the same simulator that drives the live demo (`backend/src/campus/dynamics.ts`), with hidden noise the model can't see (daily demand, attendance swings, unscheduled events). Real accuracy needs real sensor/Wi-Fi history; the pipeline is ready for it.

### Retrain / plug in a real timetable
```bash
cd backend
npm run timetable:generate     # or replace src/data/timetable.json with an ERP export (same JSON shape)
npm run ml:dataset             # simulate 70 days -> ml/timetable/dataset.csv
cd .. && python ml/timetable/train.py   # needs scikit-learn, pandas, numpy
cd backend && npm run ml:verify
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Framer Motion, Leaflet.js, Recharts |
| **Full-Stack Server** | Node.js, Express.js, TypeScript, Server-Sent Events (SSE) live data stream |
| **Python Backend / Microservices** | Python 3, FastAPI, Uvicorn, WebSockets, Firebase Admin SDK & In-Memory fallback |
| **Database & ORM** | Prisma ORM, SQLite (`dev.db` with full seed data) & Firestore repository pattern |
| **Machine Learning** | Scikit-learn GradientBoosting (timetable-aware, exported to JSON trees, served natively in Node), Pandas, NumPy |
| **AI Agent** | Groq (`openai/gpt-oss-20b`) for intent parsing + summaries, deterministic planner on top of the forecast |
| **Authentication** | JWT, bcrypt, Role-based Access Control (Student / Admin; admins are never self-registered) |

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
cp .env.example .env   # then set JWT_SECRET (and GROQ_API_KEY for the Smart Planner)
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
- **Multi-Horizon ML Forecasting**: Timetable-aware GBM at 30m, 1h, 2h and 4h, served natively in Node.
