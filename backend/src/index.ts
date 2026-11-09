import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';
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
import intelligenceRoutes from './routes/intelligenceRoutes';
import { IoTSimulationEngine } from './simulation/engine';
import { prisma } from './utils/prisma';

const app = express();
const PORT = config.port;

// CORS: restrict to CORS_ORIGINS when set (comma-separated). Auth uses Bearer tokens, not cookies.
app.use(
  cors({
    origin: config.corsOrigins.length ? config.corsOrigins : true,
    credentials: false,
  })
);
app.use(express.json({ limit: '100kb' }));

// Initialize IoT Simulation Engine
const simulationEngine = IoTSimulationEngine.getInstance();

// Server-Sent Events (SSE) Live Stream
app.get('/api/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', state: simulationEngine.getState() })}\n\n`);

  const unsubscribe = simulationEngine.subscribe((eventType, data) => {
    res.write(`data: ${JSON.stringify({ type: eventType, data })}\n\n`);
  });

  // Heartbeat keeps proxies (Render/Vercel) from closing idle streams
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    system: 'OCCUPRA AI Engine',
    timestamp: new Date().toISOString(),
    simulation: simulationEngine.getState(),
  });
});

// API Routes
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
app.use('/api/campus', intelligenceRoutes);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Auto-seed if empty, then start
async function startServer() {
  try {
    // Push schema
    const { execSync } = await import('child_process');
    try { execSync('npx prisma db push --skip-generate', { stdio: 'inherit' }); } catch (_) {}

    // Seed if no data
    const count = await prisma.resource.count();
    if (count === 0) {
      console.log('🌱 No resources found — auto-seeding database...');
      const { seedDatabase } = await import('./prisma/seed');
      await seedDatabase();
      console.log('✅ Auto-seed complete!');
    } else {
      console.log(`✅ Database ready with ${count} resources.`);
    }
  } catch (err) {
    console.error('Startup seed check failed:', err);
  }

  app.listen(PORT, () => {
    console.log(`🚀 OCCUPRA Backend listening on http://localhost:${PORT}`);
    console.log(`📡 SSE stream at http://localhost:${PORT}/api/stream`);
  });
}

startServer();
