import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import resourceRoutes from './routes/resourceRoutes';
import occupancyRoutes from './routes/occupancyRoutes';
import predictionRoutes from './routes/predictionRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import bookingRoutes from './routes/bookingRoutes';
import notificationRoutes from './routes/notificationRoutes';
import sensorRoutes from './routes/sensorRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import simulationRoutes from './routes/simulationRoutes';
import { IoTSimulationEngine } from './simulation/engine';
import { prisma } from './utils/prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: (_o, cb) => cb(null, true), credentials: true }));
app.use(express.json());

const simulationEngine = IoTSimulationEngine.getInstance();

// SSE Stream
app.get('/api/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', state: simulationEngine.getState() })}\n\n`);
  const unsub = simulationEngine.subscribe((t, d) => res.write(`data: ${JSON.stringify({ type: t, data: d })}\n\n`));
  req.on('close', () => { unsub(); res.end(); });
});

// Health
app.get('/api/health', (_req, res) => res.json({ status: 'ONLINE', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/occupancy', occupancyRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/simulation', simulationRoutes);

app.use((err: any, _req: Request, res: Response, _next: any) => {
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Auto-seed if empty, then start
async function startServer() {
  try {
    const { execSync } = await import('child_process');
    try { execSync('npx prisma db push --skip-generate', { stdio: 'inherit' }); } catch (_) {}
    const count = await prisma.resource.count();
    if (count === 0) {
      console.log('🌱 Auto-seeding...');
      const { seedDatabase } = await import('./prisma/seed');
      await seedDatabase();
      console.log('✅ Seeded!');
    }
  } catch (e) { console.error('Seed failed:', e); }

  app.listen(PORT, () => console.log(`🚀 OCCUPRA running on port ${PORT}`));
}

startServer();

export default app;
