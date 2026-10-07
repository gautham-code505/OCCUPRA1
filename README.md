# CampusPulse AI - Smart Campus Finder
> **Smart Campus Resource Finder & Crowd Prediction Platform**  
> Powered by Python, FastAPI, Virtual IoT Simulation, XGBoost Machine Learning, and Firebase Firestore.

---

## 🏛️ Project Overview

**CampusPulse AI** is an intelligent smart-campus backend platform designed to help students discover and reserve campus resources (libraries, computer labs, study rooms, classrooms, cafeterias, seminar halls) based on real-time occupancy, available capacity, walking distance, and predicted future crowd levels.

The platform follows a **"Smart Campus & IoT Simulation"** theme. In place of physical hardware sensors, CampusPulse AI features an advanced **Python-based Virtual IoT Sensor Simulation Engine** that simulates realistic turnstile, door, and optical sensor data reflecting campus diurnal cycles, lecture blocks, exam periods, and lunch rushes.

---

## 🏗️ Architecture

```
                 Virtual IoT Simulation Engine
                               ↓
                       FastAPI Backend
                               ↓
               Firebase Firestore (or In-Memory Fallback)
                               ↓
            ┌──────────────────┼──────────────────┐
            ↓                  ↓                  ↓
       ML Pipeline     Recommendation Engine  Analytics Engine
        (XGBoost)       (Multi-Factor Match)   (Temporal Insights)
            ↓                  ↓                  ↓
      Future Crowd      Ranked Resource        Campus Usage
       Predictions       Suggestions             Insights
            └──────────────────┬──────────────────┘
                               ↓
                   WebSocket / REST APIs
                               ↓
                     React Dashboard UI
```

---

## 🧰 Technology Stack

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Language** | Python | `3.9+` (tested on 3.12) | Core backend, ML, simulation |
| **API Framework** | FastAPI | `>=0.110.0` | High-performance REST APIs, WebSocket streaming |
| **Database** | Firebase Firestore | `Admin SDK 7.7.0` | Cloud database with offline in-memory repository fallback |
| **Auth** | Firebase Auth / OAuth2 + JWT | `PyJWT & bcrypt` | Role-based authorization (`STUDENT`, `ADMIN`) |
| **ML Model** | XGBoost | `>=2.0.3` | Multi-horizon crowd regression (`30m`, `1h`, `2h`, `4h`) |
| **Preprocessing & Metrics** | Scikit-learn | `>=1.4.1` | Feature scaling, train/test split, MAE/RMSE/R² evaluation |
| **Data Processing** | Pandas & NumPy | Latest | Feature engineering and matrix operations |
| **ASGI Server** | Uvicorn | `>=0.28.0` | Async server with auto-reload |
| **Testing** | Pytest & pytest-asyncio | `>=8.1.1` | Automated unit, integration, and security test suite |

---

## 📁 Project Structure

```
backend/
├── app/
│   ├── main.py                     # FastAPI entry point, lifespan, CORS, WebSockets
│   │
│   ├── api/                        # API route controllers
│   │   ├── auth.py                 # Login, register, OAuth2 token endpoint
│   │   ├── resources.py            # Resource CRUD & filters
│   │   ├── occupancy.py            # Live telemetry, campus summary, heatmap
│   │   ├── predictions.py          # ML crowd prediction endpoints
│   │   ├── recommendations.py      # Smart recommendation engine
│   │   ├── bookings.py             # Resource reservation system
│   │   ├── notifications.py        # Smart alerts & notifications
│   │   ├── analytics.py            # Historical, daily, weekly, and peak-hour analytics
│   │   ├── admin.py                # Admin utilization & dynamic insights
│   │   └── simulation.py           # Virtual IoT simulation controls
│   │
│   ├── models/ & schemas/          # Pydantic V2 request & response schemas
│   │   ├── resource.py
│   │   ├── occupancy.py
│   │   ├── prediction.py
│   │   ├── recommendation.py
│   │   ├── booking.py
│   │   ├── notification.py
│   │   ├── simulation.py
│   │   └── auth.py
│   │
│   ├── services/                   # Core business logic layer
│   │   ├── resource_service.py
│   │   ├── occupancy_service.py
│   │   ├── recommendation_service.py
│   │   ├── booking_service.py
│   │   ├── notification_service.py
│   │   ├── analytics_service.py
│   │   └── admin_service.py
│   │
│   ├── simulation/                 # Virtual IoT simulation engine
│   │   ├── simulator.py            # Async background task & WebSocket broadcaster
│   │   ├── generator.py            # Influx/outflux sensor telemetry generator
│   │   ├── scenarios.py            # normal_day, busy_day, exam_day, weekend, lunch_peak
│   │   └── resource_patterns.py    # Diurnal time-of-day curves per facility type
│   │
│   ├── ml/                         # Machine learning pipeline
│   │   ├── data_preparation.py     # Training dataset generation
│   │   ├── feature_engineering.py  # Feature vector encoding
│   │   ├── train.py                # XGBoost multi-output training & evaluation
│   │   ├── evaluate.py             # Evaluation on holdout test set (MAE, RMSE, R²)
│   │   ├── predict.py              # Inference service for 30m, 1h, 2h, 4h horizons
│   │   └── model/                  # Serialized XGBoost model artifacts (.joblib)
│   │
│   ├── database/                   # Database abstraction layer
│   │   ├── firebase.py             # Firebase Admin SDK connection & fallback
│   │   ├── seed_data.py            # Default campus resources seed
│   │   └── repositories/           # Dual-mode (Firestore / In-Memory) repositories
│   │       ├── base_repo.py
│   │       ├── resource_repo.py
│   │       ├── occupancy_repo.py
│   │       ├── booking_repo.py
│   │       ├── notification_repo.py
│   │       └── user_repo.py
│   │
│   ├── core/                       # Core configuration and security
│   │   ├── config.py               # Pydantic Settings
│   │   ├── security.py             # Native bcrypt hashing & JWT tokens
│   │   └── dependencies.py         # Auth & RBAC dependencies
│   │
│   └── websocket/                  # Real-time WebSocket connection manager
│       └── manager.py
│
├── tests/                          # 29 Pytest unit and integration tests
├── requirements.txt                # Python dependencies
├── .env.example                    # Sample environment variables
├── .env                            # Local configuration
├── run.py                          # Launcher script
└── README.md
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.9, 3.10, 3.11, or 3.12 installed.

### 2. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3. Launch the Backend Server
You can launch the backend using either `uvicorn` directly or via `run.py`:

**Option A: Using Uvicorn (Recommended for development)**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Option B: Using Python Launcher**
```bash
# From workspace root or backend folder:
python run.py
```

The API will be available at:
- **API Base**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`
- **Live WebSocket Feed**: `ws://localhost:8000/ws/occupancy`

---

## 🔑 Firebase Configuration (Provide Your Own)

The system is designed with a **Repository Pattern**. It runs out-of-the-box with high-speed in-memory storage for offline development and testing, and connects automatically to your real Firebase Firestore once you supply your credentials.

### How to Connect Your Firebase Project:

#### Option 1: Using Service Account JSON File (Recommended)
1. Go to the [Firebase Console](https://console.firebase.google.com/) -> **Project Settings** -> **Service accounts**.
2. Click **Generate new private key** and download the JSON file (e.g. `serviceAccountKey.json`).
3. Place the file inside `backend/` or specify its path in `backend/.env`:
   ```ini
   FIREBASE_CREDENTIALS_PATH=serviceAccountKey.json
   FIREBASE_PROJECT_ID=your-firebase-project-id
   ```

#### Option 2: Using Environment Variables in `.env`
Open `backend/.env` and paste your Firebase service account details:
```ini
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkq...-----END PRIVATE KEY-----\n"
```

Restart the backend server. The logs will confirm:
```
[INFO] Successfully connected to user's Firebase Firestore!
```

---

## 🤖 Machine Learning Pipeline (XGBoost)

The ML pipeline forecasts crowd occupancy across **4 horizons**:
- `30_minutes`
- `1_hour`
- `2_hours`
- `4_hours`

### Model Training
To retrain the XGBoost crowd prediction model:
```bash
cd backend
python app/ml/train.py
```

### Model Evaluation
To evaluate the saved model on a fresh holdout dataset:
```bash
cd backend
python app/ml/evaluate.py
```

**Evaluation Results (Verified on Holdout Test Set):**
```
================ MODEL EVALUATION REPORT ================
Horizon target_30m   | MAE:  5.43 seats | RMSE:  9.13 | R²: 0.9712
Horizon target_1h    | MAE:  8.06 seats | RMSE: 15.10 | R²: 0.9238
Horizon target_2h    | MAE:  7.95 seats | RMSE: 14.67 | R²: 0.9305
Horizon target_4h    | MAE:  7.90 seats | RMSE: 14.23 | R²: 0.9383
=========================================================
```

---

## 📡 Virtual IoT Sensor Simulation Engine

The simulation engine models virtual turnstiles and infrared door sensors generating telemetry every `SIMULATION_INTERVAL_SECONDS` (default: 10s).

### Built-in Scenarios:
| Scenario | Characteristics |
| :--- | :--- |
| `normal_day` | Standard diurnal cycles, lecture blocks, study peaks |
| `busy_day` | Deadline rush (+25% occupancy, high flux) |
| `exam_day` | Library & Study rooms surge (+60% to +70%), low cafeteria linger |
| `weekend` | Academic buildings quiet, library open |
| `lunch_peak` | Mid-day cafeteria rush reaches maximum capacity |

### Control APIs (Admin Only):
- `GET /api/simulation/status` - Current simulation status
- `POST /api/simulation/start` - Start background simulation loop
- `POST /api/simulation/stop` - Pause simulation
- `POST /api/simulation/reset` - Reset state
- `POST /api/simulation/scenario` - Switch scenario (e.g. `{"scenario": "exam_day"}`)
- `POST /api/simulation/speed` - Update tick interval (e.g. `{"interval_seconds": 2.0}`)

### WebSocket Real-Time Stream:
Connect to `ws://localhost:8000/ws/occupancy` to receive instantaneous updates whenever the virtual sensors tick.

---

## 🎯 Smart Recommendation Engine

Endpoint: `GET /api/recommendations`

Calculates a 0–100 `match_score` based on:
1. **Current Occupancy Penalty**: Lower crowd gets higher score.
2. **Predicted Stability**: Favors locations where XGBoost predicts crowd will remain calm for the next hour.
3. **Walking Distance**: Uses the Haversine spherical formula based on student coordinates.
4. **Facility Satisfaction**: Matches required amenities (e.g. "WiFi", "Power Outlets", "Smart TV").
5. **Capacity Headroom**: Ensures minimum requested seats are available.

---

## 👥 Authentication & Default Accounts

For quick hackathon testing, two default accounts are seeded automatically:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@campuspulse.ai` | `AdminPass123!` |
| **Student** | `student@campuspulse.ai` | `StudentPass123!` |

- Login via `POST /api/auth/login` to receive a JWT access token.
- You can also click the **Authorize** button in Swagger UI (`/docs`) and log in directly using the OAuth2 form.

---

## 🧪 Running Automated Tests

Run the complete test suite (29 tests across all features):
```bash
cd backend
python -m pytest tests -v
```

Tests cover:
- ✅ Resource CRUD & filtering
- ✅ Live occupancy telemetry & campus summary
- ✅ Geographical heatmap data format
- ✅ XGBoost 4-horizon prediction output
- ✅ Smart recommendation score ranking
- ✅ Resource booking creation, capacity bounds, and conflict prevention
- ✅ User authentication and RBAC permissions
- ✅ Virtual IoT simulation controls and scenario transitions
- ✅ Daily/weekly historical trends and automated admin insights
