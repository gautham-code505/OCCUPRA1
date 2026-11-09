# 🚀 Deployment Guide for OCCUPRA / CampusPulse AI

This application consists of:
- **Backend API & IoT Simulation Engine:** Node.js + TypeScript + Express + Prisma (SQLite with pre-seeded data) + Server-Sent Events (SSE)
- **Frontend Dashboard:** React 18 + Vite + Tailwind CSS + Leaflet.js

We recommend **Render** for the backend and **Vercel** for the frontend.

---

## Prerequisites: Push to GitHub

If you haven't initialized Git and pushed this folder to GitHub yet:

1. Open PowerShell or Command Prompt in this folder:
   ```bash
   cd path\to\OCCUPRA1
   ```
2. Initialize repository and commit:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for OCCUPRA deployment"
   ```
3. Create a new repository on [GitHub](https://github.com/new).
4. Link and push:
   ```bash
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 1: Deploy Backend to Render (Render.com)

You can deploy automatically via the included `render.yaml` Blueprint or manually:

### Option A: Automatic via Render Blueprint (Fastest)
1. Log in to [Render](https://render.com/).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub repository.
4. Render will read `render.yaml` automatically and configure everything.
5. Click **Apply**.

### Option B: Manual Web Service Setup
1. On [Render](https://render.com/), click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Name:** `occupra-backend`
   - **Region:** Any (e.g., Oregon or Frankfurt)
   - **Root Directory:** `backend` *(⚠️ Essential!)*
   - **Runtime:** `Node`
   - **Build Command:**
     ```bash
     npm install && npx prisma generate && npx prisma db push && npx tsx src/prisma/seed.ts
     ```
   - **Start Command:**
     ```bash
     npx tsx src/index.ts
     ```
4. **Environment Variables:**
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
   - `DATABASE_URL` = `file:./dev.db`
   - `JWT_SECRET` = a long random string (Render: use **Generate**). Never reuse a value from the docs.
   - `GROQ_API_KEY` = your Groq key (Smart Planner). Paste it only in the Render dashboard.
   - `GROQ_MODEL` = `openai/gpt-oss-20b`
   - `CORS_ORIGINS` = your Vercel URL, e.g. `https://occupra.vercel.app`
5. Click **Create Web Service**.
6. Wait for the build logs to show `✨ CampusPulse AI database seeding completed successfully!` and `Server running on port 10000`.
7. **Copy your backend URL** (e.g., `https://occupra-backend.onrender.com`).

---

## Step 2: Deploy Frontend to Vercel (Vercel.com)

1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New...** > **Project**.
3. Select your GitHub repository.
4. Configure the project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click Edit and select `frontend` *(⚠️ Essential!)*
5. **Environment Variables:**
   - Click to expand **Environment Variables**
   - Add:
     - **Key:** `VITE_API_URL`
     - **Value:** `https://occupra-backend.onrender.com` *(Replace with your actual Render URL from Step 1)*
6. Click **Deploy**.
7. In ~1 minute, Vercel will provide your live URL (e.g., `https://occupra.vercel.app`).

---

## Step 3: Verification & Demo Checklist

1. Open your live Vercel URL.
2. Sign in with either demo account:
   - **Student Account:**
     - **Email:** `student@campus.ai`
     - **Password:** `student123`
   - **Admin Command Center:**
     - **Email:** `admin@campus.ai`
     - **Password:** `admin123`
3. Verify live features:
   - Look at the top bar / IoT badge: the SSE stream status should show **LIVE** (green pulse).
   - Explore the **Interactive Digital Twin Map** and **Live Crowd Heatmap**.
   - Check **Crowd Prediction** and test the **Smart Recommendation Wizard**.
   - In Admin Mode, check the **IoT Sensor Control Center** and trigger simulation scenarios.
   - Admin → **Command Center → Demo Clock** → "Mon 12:20 · lunch rush" to show timetable-driven peaks at any hour.
   - Student → **Smart Planner**, Admin → **Energy Optimizer** and **What-If Simulator**.

> ⚠️ Render's free disk is ephemeral: the SQLite database is re-created and re-seeded on every deploy/restart.
