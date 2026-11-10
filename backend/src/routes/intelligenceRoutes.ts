import express, { Router, Response, Request } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { analyzeEnergy } from '../services/energyService';
import { runWhatIf } from '../services/whatIfService';
import { buildPlan, checkPlan, PlanStep, transcribeAudio } from '../services/agentService';
import { chat } from '../services/chatService';
import { getTimetable, sessionsForDay, Scenario } from '../campus/timetable';
import { simClock } from '../campus/clock';
import { DAY_NAMES, hhmm, parseClock } from '../campus/time';
import { wifiState } from '../campus/liveState';
import { IoTSimulationEngine } from '../simulation/engine';

const router = Router();

const dayParam = (q: any) => {
  const d = q !== undefined ? Number(q) : simClock.info().dow;
  return Number.isInteger(d) && d >= 0 && d <= 6 ? d : simClock.info().dow;
};

// ---------- Timetable (ERP feed) ----------
router.get('/timetable', (req: Request, res: Response) => {
  const tt = getTimetable();
  const dow = dayParam(req.query.day);
  const sessions = sessionsForDay(tt, dow).map((s) => ({ ...s, startLabel: hhmm(s.start), endLabel: hhmm(s.end) }));
  res.json({ version: tt.version, source: tt.source, day: dow, dayName: DAY_NAMES[dow], totalWeeklySessions: tt.sessions.length, sessions });
});

router.get('/clock', (_req, res) => res.json(simClock.info()));

// ---------- Energy & consolidation (admin) ----------
router.get('/energy', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const resources = await prisma.resource.findMany();
    const clock = simClock.info();
    const tariff = req.query.tariff !== undefined ? Number(req.query.tariff) : undefined;
    const co2 = req.query.co2 !== undefined ? Number(req.query.co2) : undefined;
    const dow = dayParam(req.query.day);
    res.json({
      day: dow,
      dayName: DAY_NAMES[dow],
      ...analyzeEnergy(resources, {
        dow,
        tariff: Number.isFinite(tariff) && tariff! > 0 ? tariff : undefined,
        co2Factor: Number.isFinite(co2) && co2! > 0 ? co2 : undefined,
        nowMinute: dow === clock.dow ? clock.minuteOfDay : undefined,
      }),
    });
  } catch (err) {
    console.error('Energy analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze energy' });
  }
});

/** Apply a consolidation action: close a room (students get a nudge) or reopen it. */
router.post('/energy/apply', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { resourceId, open } = req.body ?? {};
  const r = await prisma.resource.findUnique({ where: { id: String(resourceId) } });
  if (!r) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }
  const updated = await prisma.resource.update({ where: { id: r.id }, data: { isAvailable: Boolean(open) } });
  const notif = await prisma.notification.create({
    data: {
      userId: null, resourceId: r.id, type: 'AVAILABILITY',
      title: open ? `${r.name} reopened` : `${r.name} closing to save energy`,
      message: open ? `${r.name} is open again.` : `${r.name} is being consolidated to save energy — please use a nearby ${r.type.replace('_', ' ').toLowerCase()} (see Smart Finder).`,
    },
  });
  IoTSimulationEngine.getInstance().broadcast('NOTIFICATION', notif);
  res.json({ success: true, resource: updated });
});

// ---------- What-if simulator (admin) ----------
router.post('/whatif', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const dow = dayParam(body.day);
    let scenario: Scenario;
    const minutes = Math.max(-120, Math.min(120, Math.round(Number(body.minutes) || 0)));
    switch (body.type) {
      case 'shift_slot': {
        const slot = parseClock(String(body.slotStart ?? ''));
        if (slot === null) {
          res.status(400).json({ error: 'slotStart must be a time like "12:00"' });
          return;
        }
        scenario = { type: 'shift_slot', slotStart: slot, minutes };
        break;
      }
      case 'stagger':
        scenario = { type: 'stagger', minutes };
        break;
      case 'attendance':
        scenario = { type: 'attendance', factor: Math.max(0.3, Math.min(1.5, Number(body.factor) || 1)) };
        break;
      default:
        res.status(400).json({ error: 'type must be shift_slot | stagger | attendance' });
        return;
    }
    const resources = await prisma.resource.findMany();
    res.json(runWhatIf(resources, dow, scenario));
  } catch (err) {
    console.error('What-if error:', err);
    res.status(500).json({ error: 'Failed to run what-if scenario' });
  }
});

// ---------- Agent ----------
router.post('/agent/plan', authenticate, async (req: AuthRequest, res: Response) => {
  const message = String(req.body?.message ?? '').trim();
  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }
  try {
    const lang = typeof req.body?.lang === 'string' ? req.body.lang.slice(0, 5) : 'en';
    res.json(await buildPlan(message, lang));
  } catch (err) {
    console.error('Agent plan error:', err);
    res.status(500).json({ error: 'Failed to build plan' });
  }
});

// Voice input: raw audio body (max ~6 MB ≈ a 1-minute clip), transcribed with Groq Whisper
router.post(
  '/agent/transcribe',
  authenticate,
  express.raw({ type: ['audio/*', 'video/webm', 'application/octet-stream'], limit: '6mb' }),
  async (req: AuthRequest, res: Response) => {
    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length < 1000) {
      res.status(400).json({ error: 'No audio received — hold the mic a little longer.' });
      return;
    }
    try {
      const lang = String(req.query.lang ?? 'en').slice(0, 5);
      const text = await transcribeAudio(body, String(req.headers['content-type'] ?? 'audio/webm'), lang);
      res.json({ text });
    } catch (err: any) {
      console.error('Transcribe error:', err?.message);
      res.status(502).json({ error: 'Could not understand the audio. Please try again or type your request.' });
    }
  }
);

// Conversational assistant (Occy): chats, answers crowd/app questions, and plans when asked
router.post('/agent/chat', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lang = typeof req.body?.lang === 'string' ? req.body.lang.slice(0, 5) : 'en';
    const firstName = (req.user?.name || 'there').split(' ')[0];
    res.json(await chat(req.body?.messages, lang, firstName));
  } catch (err) {
    console.error('Agent chat error:', err);
    res.status(500).json({ error: 'Occy could not answer right now. Please try again.' });
  }
});

router.post('/agent/check', authenticate, async (req: AuthRequest, res: Response) => {
  const steps = Array.isArray(req.body?.steps) ? (req.body.steps as PlanStep[]).slice(0, 6) : [];
  try {
    res.json(await checkPlan(steps));
  } catch (err) {
    console.error('Agent check error:', err);
    res.status(500).json({ error: 'Failed to check plan' });
  }
});

// ---------- WiFi soft-sensing ----------
router.get('/wifi', async (_req: Request, res: Response) => {
  const resources = await prisma.resource.findMany({ select: { id: true, name: true, code: true, type: true, currentOccupancy: true, capacity: true } });
  const zones = resources.map((r) => {
    const w = wifiState.get(r.id);
    const est = w?.estimate ?? null;
    const errPct = est !== null && r.currentOccupancy > 0 ? Math.round((Math.abs(est - r.currentOccupancy) / r.currentOccupancy) * 1000) / 10 : null;
    return {
      resourceId: r.id, name: r.name, code: r.code, type: r.type, capacity: r.capacity,
      doorCounter: r.currentOccupancy, wifiDevices: w?.devices ?? null, wifiEstimate: est,
      learnedDevicesPerPerson: w ? Math.round(w.ratio * 100) / 100 : null, errorPct: errPct,
    };
  });
  const valid = zones.filter((z) => z.errorPct !== null);
  res.json({
    method: 'Access-point client counts calibrated per zone against door counters (online least squares)',
    meanAbsErrorPct: valid.length ? Math.round((valid.reduce((s, z) => s + z.errorPct!, 0) / valid.length) * 10) / 10 : null,
    zones,
  });
});

export default router;
