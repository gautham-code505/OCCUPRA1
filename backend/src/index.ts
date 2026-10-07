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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json());

// Initialize IoT Simulation Engine
const simulationEngine = IoTSimulationEngine.getInstance();

// Server-Sent Events (SSE) Live Stream Endpoint
app.get('/api/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial connected event
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', state: simulationEngine.getState() })}\n\n`);

  // Subscribe to real-time simulation updates
  const unsubscribe = simulationEngine.subscribe((eventType, data) => {
    res.write(`data: ${JSON.stringify({ type: eventType, data })}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
    res.end();
  });
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    system: 'CAMPUSPULSE AI Engine',
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

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 CampusPulse AI Backend Server listening on http://localhost:${PORT}`);
  console.log(`📡 IoT Real-Time SSE stream available at http://localhost:${PORT}/api/stream`);
});
