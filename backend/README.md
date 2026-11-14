# OCCUPRA - Backend

> **Smart Campus Occupancy & Resource Intelligence**

Please see the root [README.md](../README.md) for full project documentation.

### Quick Start (Node.js API — the one the web app uses)
```bash
npm install
cp .env.example .env   # set JWT_SECRET, and GROQ_API_KEY for the Smart Planner chat/voice
npm run dev            # http://localhost:5000
```
- Health check: http://localhost:5000/api/health
- Live data stream (SSE): http://localhost:5000/api/stream

### Optional: Python FastAPI service
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://localhost:8000/docs
```
