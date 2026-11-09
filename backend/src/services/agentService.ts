/**
 * "Find me a slot" campus agent.
 *
 * The LLM (Groq) only does language: it turns a free-text request into structured tasks and
 * writes a short explanation. Choosing spaces and times is deterministic code over the
 * timetable-aware forecast, so the agent cannot invent rooms or numbers. Without a Groq key
 * (or if Groq fails) a keyword parser and template summary keep it working.
 */
import { Resource } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { PredictionService, PredictionResult } from './predictionService';
import { IoTSimulationEngine } from '../simulation/engine';
import { simClock } from '../campus/clock';
import { ampm, hhmm, parseClock } from '../campus/time';

export type Activity = 'study' | 'group_study' | 'computer' | 'print' | 'research' | 'food' | 'relax';

export interface PlanTask {
  activity: Activity;
  durationMinutes: number;
  seats: number;
  quiet?: boolean;
}

export interface PlanIntent {
  tasks: PlanTask[];
  startTime?: string; // "HH:MM"
  maxCrowdPct?: number;
}

export interface PlanStep {
  order: number;
  activity: Activity;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  building: string;
  startMinute: number;
  endMinute: number;
  start: string;
  end: string;
  startLabel: string;
  endLabel: string;
  seats: number;
  predictedPct: number;
  currentPct: number;
  bookable: boolean;
  reason: string;
}

const ACTIVITY_TYPES: Record<Activity, string[]> = {
  study: ['LIBRARY', 'STUDY_ROOM'],
  group_study: ['STUDY_ROOM', 'ACTIVITY_CENTER', 'LIBRARY'],
  computer: ['COMPUTER_LAB'],
  print: ['LIBRARY', 'COMPUTER_LAB'],
  research: ['RESEARCH_LAB'],
  food: ['CANTEEN'],
  relax: ['ACTIVITY_CENTER'],
};
const ACTIVITY_LABEL: Record<Activity, string> = {
  study: 'Study', group_study: 'Group study', computer: 'Computer work', print: 'Print notes',
  research: 'Research lab', food: 'Eat', relax: 'Break',
};
const DEFAULT_DURATION: Record<Activity, number> = { study: 90, group_study: 60, computer: 60, print: 15, research: 90, food: 30, relax: 30 };
const NOT_BOOKABLE = new Set(['CANTEEN', 'ACTIVITY_CENTER']);
const WALK_MIN = 5;

// ---------------- Intent extraction ----------------

const SYSTEM_PROMPT = `You convert a university student's request into JSON for a campus planner.
Return ONLY a JSON object: {"tasks":[{"activity":A,"durationMinutes":N,"seats":N,"quiet":bool}],"startTime":"HH:MM"|null,"maxCrowdPct":N|null}
A is one of: "study","group_study","computer","print","research","food","relax".
Map: reading/revision/assignment -> study; team/project meeting/discuss -> group_study; coding/lab work/PC -> computer;
print/photocopy -> print; lunch/eat/coffee/snack -> food; rest/games/chill -> relax; GPU/research -> research.
Keep the user's order. If a total free time is given and durations are not, split it sensibly (print ~15, food ~30).
seats = number of people (default 1; "with 3 friends" = 4). startTime only if the user says when (24h).
maxCrowdPct: 40 if they want it quiet/peaceful, else null.`;

const FALLBACK_MODELS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'];

async function groqChat(messages: { role: string; content: string }[], json: boolean, maxTokens = 400): Promise<string> {
  const models = [config.groqModel, ...FALLBACK_MODELS.filter((m) => m !== config.groqModel)];
  let lastErr: unknown;
  for (const model of models) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    try {
      const reasoning = model.startsWith('openai/gpt-oss');
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.groqApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          // reasoning models spend tokens thinking first — give them headroom and keep it brief
          max_tokens: reasoning ? maxTokens + 700 : maxTokens,
          ...(reasoning ? { reasoning_effort: 'low' } : {}),
          ...(json ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: ctrl.signal,
      });
      if (res.status === 404 || res.status === 400) {
        lastErr = new Error(`Groq HTTP ${res.status} for ${model}: ${(await res.text()).slice(0, 160)}`);
        continue; // model retired/unsupported → try the next one
      }
      if (!res.ok) throw new Error(`Groq HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data: any = await res.json();
      return data.choices?.[0]?.message?.content ?? '';
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error('No Groq model available');
}

const VALID: Activity[] = ['study', 'group_study', 'computer', 'print', 'research', 'food', 'relax'];

function sanitizeIntent(raw: any): PlanIntent | null {
  if (!raw || !Array.isArray(raw.tasks)) return null;
  const tasks: PlanTask[] = raw.tasks
    .filter((t: any) => VALID.includes(t?.activity))
    .slice(0, 4)
    .map((t: any) => ({
      activity: t.activity as Activity,
      durationMinutes: Math.max(10, Math.min(240, Math.round(Number(t.durationMinutes) || DEFAULT_DURATION[t.activity as Activity]))),
      seats: Math.max(1, Math.min(20, Math.round(Number(t.seats) || 1))),
      quiet: Boolean(t.quiet),
    }));
  if (!tasks.length) return null;
  const st = typeof raw.startTime === 'string' && parseClock(raw.startTime) !== null ? raw.startTime : undefined;
  const mc = Number(raw.maxCrowdPct);
  return { tasks, startTime: st, maxCrowdPct: Number.isFinite(mc) && mc > 0 ? Math.min(95, mc) : undefined };
}

/** Offline fallback: keyword parser */
export function parseIntentLocally(text: string): PlanIntent {
  const t = text.toLowerCase();
  const found: { idx: number; activity: Activity }[] = [];
  const rules: [RegExp, Activity][] = [
    [/\b(print|photocop|xerox)/, 'print'],
    [/\b(eat|lunch|food|snack|coffee|breakfast|dinner|canteen)/, 'food'],
    [/\b(group|team|friends|discuss|project meeting)/, 'group_study'],
    [/\b(code|coding|program|computer|pc|lab work)/, 'computer'],
    [/\b(gpu|research)/, 'research'],
    [/\b(relax|rest|chill|games|break)\b/, 'relax'],
    [/\b(study|read|revis|assignment|exam|prepare|homework)/, 'study'],
  ];
  for (const [re, a] of rules) {
    const m = t.match(re);
    if (m && m.index !== undefined && !found.some((f) => f.activity === a)) found.push({ idx: m.index, activity: a });
  }
  if (!found.length) found.push({ idx: 0, activity: 'study' });
  found.sort((a, b) => a.idx - b.idx);
  const hours = t.match(/(\d+(?:\.\d+)?)\s*(?:free\s+|spare\s+)?(?:hours?|hrs?|h)\b/);
  const total = hours ? Number(hours[1]) * 60 : undefined;
  const friends = t.match(/(\d+)\s*(?:friends|people|of us|members)/);
  const seats = friends ? Number(friends[1]) + (/(friends)/.test(friends[0]) ? 1 : 0) : 1;
  const fixed = found.filter((f) => ['print', 'food', 'relax'].includes(f.activity)).reduce((s, f) => s + DEFAULT_DURATION[f.activity], 0);
  const flexible = found.filter((f) => !['print', 'food', 'relax'].includes(f.activity));
  const tasks = found.map((f) => ({
    activity: f.activity,
    durationMinutes:
      total && flexible.length && flexible.includes(f) ? Math.max(30, Math.round((total - fixed) / flexible.length)) : DEFAULT_DURATION[f.activity],
    seats: ['food', 'print'].includes(f.activity) ? 1 : seats,
    quiet: /quiet|silent|peace/.test(t),
  }));
  const at = t.match(/\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/);
  const startMin = at ? parseClock(at[1].replace(/\s+/g, ' ').toUpperCase()) : null;
  return { tasks, startTime: startMin !== null ? hhmm(startMin) : undefined, maxCrowdPct: /quiet|silent|peace/.test(t) ? 40 : undefined };
}

export async function extractIntent(message: string): Promise<{ intent: PlanIntent; llmUsed: boolean; llmError?: string }> {
  if (config.groqApiKey) {
    try {
      const out = await groqChat([{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: message.slice(0, 600) }], true);
      const intent = sanitizeIntent(JSON.parse(out));
      if (intent) return { intent, llmUsed: true };
    } catch (err: any) {
      console.warn('[agent] Groq intent extraction failed, using local parser:', err?.message);
      return { intent: parseIntentLocally(message), llmUsed: false, llmError: String(err?.message ?? err).slice(0, 160) };
    }
  }
  return { intent: parseIntentLocally(message), llmUsed: false };
}

// ---------------- Planning ----------------

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]));
}

interface Ctx {
  resources: Resource[];
  forecasts: Map<string, PredictionResult[]>;
  nowMinute: number;
}

function isOpen(r: Resource, start: number, end: number) {
  const o = parseClock(r.openingTime) ?? 480;
  const c = parseClock(r.closingTime) ?? 1260;
  return start >= o && end <= c;
}

function candidatesFor(task: PlanTask, ctx: Ctx, start: number, maxCrowd: number) {
  const ahead = start - ctx.nowMinute;
  return ctx.resources
    .filter((r) => r.isAvailable && ACTIVITY_TYPES[task.activity].includes(r.type) && isOpen(r, start, start + task.durationMinutes))
    .filter((r) => task.activity !== 'print' || /print/i.test(r.facilities) || r.type === 'COMPUTER_LAB')
    .map((r) => {
      const mid = ahead + task.durationMinutes / 2;
      const pStart = PredictionService.predictPctAtSync(r, ahead, ctx.resources, ctx.forecasts.get(r.id));
      const pMid = PredictionService.predictPctAtSync(r, mid, ctx.resources, ctx.forecasts.get(r.id));
      const predicted = Math.max(pStart, pMid);
      const freeSeats = r.capacity * (1 - predicted / 100);
      const preferQuiet = task.quiet && r.type === 'STUDY_ROOM' ? -5 : 0;
      const cost = predicted + r.distanceMeters / 40 + (predicted > maxCrowd ? 40 : 0) + preferQuiet;
      return { r, predicted, cost, ok: freeSeats >= task.seats };
    })
    .filter((c) => c.ok)
    .sort((a, b) => a.cost - b.cost);
}

export interface SkippedTask {
  activity: Activity;
  label: string;
  reason: string;
  kind: 'skipped' | 'shortened';
}

/** Explain why no space fits a task at time `t` (closed vs. full), with when it next opens. */
function whyUnavailable(task: PlanTask, ctx: Ctx, t: number): string {
  const kinds = ctx.resources.filter((r) => r.isAvailable && ACTIVITY_TYPES[task.activity].includes(r.type));
  if (!kinds.length) return `no ${ACTIVITY_LABEL[task.activity].toLowerCase()} space is open on campus right now`;
  const end = t + task.durationMinutes;
  const openOnes = kinds.filter((r) => isOpen(r, t, end));
  if (!openOnes.length) {
    const latestClose = Math.max(...kinds.map((r) => parseClock(r.closingTime) ?? 1260));
    const earliestOpen = Math.min(...kinds.map((r) => parseClock(r.openingTime) ?? 480));
    const lastOpen = kinds.filter((r) => (parseClock(r.closingTime) ?? 1260) === latestClose);
    const names = lastOpen.length > 2 ? `all ${ACTIVITY_LABEL[task.activity].toLowerCase()} spaces` : lastOpen.map((r) => r.name).join(' / ');
    kinds.splice(0, kinds.length, ...lastOpen);
    return t >= latestClose || end > latestClose
      ? `${names} ${kinds.length > 1 ? 'close' : 'closes'} at ${hhmm(latestClose)} — opens again at ${hhmm(earliestOpen)}`
      : `${names} ${kinds.length > 1 ? 'open' : 'opens'} at ${hhmm(earliestOpen)}`;
  }
  return task.seats > 1
    ? `no open space has ${task.seats} free seats at ${hhmm(t)}`
    : `every open space is too crowded at ${hhmm(t)}`;
}

const SKIP_PENALTY = 1000;

function planOrder(order: PlanTask[], ctx: Ctx, start: number, maxCrowd: number) {
  let t = start;
  let total = 0;
  const steps: { task: PlanTask; r: Resource; start: number; end: number; predicted: number; runnerUp?: { r: Resource; predicted: number } }[] = [];
  const skipped: SkippedTask[] = [];
  for (let task of order) {
    let cands = candidatesFor(task, ctx, t, maxCrowd);
    if (!cands.length) {
      // Near closing time: shorten the activity to fit before the space closes (min 30 min)
      const closes = ctx.resources
        .filter((r) => r.isAvailable && ACTIVITY_TYPES[task.activity].includes(r.type) && isOpen(r, t, t + 1))
        .map((r) => parseClock(r.closingTime) ?? 1260);
      const room = closes.length ? Math.max(...closes) - t : 0;
      if (room >= 30 && room < task.durationMinutes) {
        const shorter = { ...task, durationMinutes: room };
        cands = candidatesFor(shorter, ctx, t, maxCrowd);
        if (cands.length) {
          skipped.push({ activity: task.activity, label: ACTIVITY_LABEL[task.activity], reason: `shortened to ${room} min — ${cands[0].r.name} closes at ${hhmm(t + room)}`, kind: 'shortened' });
          task = shorter;
        }
      }
    }
    if (!cands.length) {
      // Keep the rest of the plan; explain what couldn't be scheduled
      skipped.push({ activity: task.activity, label: ACTIVITY_LABEL[task.activity], reason: whyUnavailable(task, ctx, t), kind: 'skipped' });
      total += SKIP_PENALTY;
      continue;
    }
    const best = cands[0];
    steps.push({ task, r: best.r, start: t, end: t + task.durationMinutes, predicted: best.predicted, runnerUp: cands[1] && { r: cands[1].r, predicted: cands[1].predicted } });
    total += best.cost * (task.durationMinutes / 60);
    t += task.durationMinutes + WALK_MIN;
  }
  return { steps, skipped, total };
}

export async function buildPlan(message: string) {
  const { intent, llmUsed, llmError } = await extractIntent(message);
  const resources = await prisma.resource.findMany({ include: { sensors: true } });
  const engine = IoTSimulationEngine.getInstance();
  const forecasts = new Map<string, PredictionResult[]>();
  for (const r of resources) forecasts.set(r.id, engine.getLatestForecasts().get(r.id) ?? PredictionService.forecastSync(r, resources).predictions);

  const clock = simClock.info();
  const nowMinute = clock.minuteOfDay;
  const requested = intent.startTime ? parseClock(intent.startTime) : null;
  const start = Math.ceil(Math.max(nowMinute, requested ?? nowMinute) / 5) * 5;
  const maxCrowd = intent.maxCrowdPct ?? 70;
  const ctx: Ctx = { resources, forecasts, nowMinute };

  // Try every order (≤ 24) — "food" and "print" are flexible; pick the least crowded overall
  const asked = planOrder(intent.tasks, ctx, start, maxCrowd);
  let best = asked;
  let reordered = false;
  for (const perm of permutations(intent.tasks)) {
    const p = planOrder(perm, ctx, start, maxCrowd);
    if (p.total < best.total - 3) {
      best = p;
      reordered = perm.some((t, i) => t !== intent.tasks[i]);
    }
  }
  const skipped = best.skipped;
  const notDone = skipped.filter((s) => s.kind === 'skipped');
  const shortened = skipped.filter((s) => s.kind === 'shortened');
  const skippedNote = [
    shortened.length ? 'Adjusted: ' + shortened.map((s) => `${s.label.toLowerCase()} ${s.reason}`).join('; ') + '.' : '',
    notDone.length ? 'Not scheduled: ' + notDone.map((s) => `${s.label.toLowerCase()} (${s.reason})`).join('; ') + '.' : '',
  ].filter(Boolean).join(' ');
  if (!best.steps.length) {
    return {
      intent, llmUsed, llmError, steps: [], skipped, reordered: false, clock,
      summary: `I couldn't schedule anything right now (${hhmm(nowMinute)}). ${skippedNote} Try again during campus hours (most spaces open 07:00–23:00).`,
    };
  }

  const steps: PlanStep[] = best.steps.map((s, i) => {
    const cur = s.r.occupancyPercent;
    const delta = Math.round(s.predicted - cur);
    const trendTxt = Math.abs(delta) >= 5 ? ` (now ${Math.round(cur)}%, ${delta > 0 ? 'rising' : 'easing'})` : '';
    const alt = s.runnerUp ? ` Backup: ${s.runnerUp.r.name} (${Math.round(s.runnerUp.predicted)}%).` : '';
    return {
      order: i + 1,
      activity: s.task.activity,
      resourceId: s.r.id,
      resourceName: s.r.name,
      resourceType: s.r.type,
      building: s.r.building,
      startMinute: s.start,
      endMinute: s.end,
      start: hhmm(s.start),
      end: hhmm(s.end),
      startLabel: ampm(s.start),
      endLabel: ampm(s.end),
      seats: s.task.seats,
      predictedPct: Math.round(s.predicted),
      currentPct: Math.round(cur),
      bookable: !NOT_BOOKABLE.has(s.r.type),
      reason: `${ACTIVITY_LABEL[s.task.activity]} at ${s.r.name}: forecast ${Math.round(s.predicted)}% full${trendTxt}, ${s.r.distanceMeters}m away.${alt}`,
    };
  });

  let reorderNote = '';
  if (reordered && asked.steps.length) {
    // Explain the biggest crowd we avoided by changing the order
    const gains = best.steps
      .map((s) => {
        const orig = asked.steps.find((a) => a.task === s.task);
        return orig ? { s, orig, gain: orig.predicted - s.predicted } : null;
      })
      .filter((g): g is NonNullable<typeof g> => !!g && g.gain >= 8)
      .sort((a, b) => b.gain - a.gain);
    if (gains[0]) {
      const g = gains[0];
      reorderNote = `I moved "${ACTIVITY_LABEL[g.s.task.activity].toLowerCase()}" to ${hhmm(g.s.start)}: ${g.s.r.name} is forecast ~${Math.round(g.s.predicted)}% then vs ~${Math.round(g.orig.predicted)}% at ${hhmm(g.orig.start)}.`;
    }
  }

  const template =
    steps.map((s) => `${s.start}–${s.end} ${ACTIVITY_LABEL[s.activity].toLowerCase()} at ${s.resourceName} (~${s.predictedPct}% full)`).join(', then ') +
    '.' + (reorderNote ? ' ' + reorderNote : ''); // skipped/shortened tasks are returned separately in `skipped`

  let summary = template;
  if (llmUsed && config.groqApiKey) {
    try {
      summary = (
        await groqChat(
          [
            { role: 'system', content: 'You are a friendly campus assistant talking to a student. In at most 2 short, natural sentences, summarise ONLY the activities in the plan (places and times); do not mention anything else the student may have asked for. Add a reason ONLY if one is directly supported by the given numbers (e.g. crowd now much higher than the forecast means the place is emptying out) or by reorderNote; never invent crowd peaks or times that are not in the data. Use ONLY the facts given, in plain words (never write field names like crowdPercentNow). No markdown, no greetings.' },
            { role: 'user', content: JSON.stringify({ plan: steps.map((s) => ({ activity: ACTIVITY_LABEL[s.activity], place: s.resourceName, from: s.start, to: s.end, crowdPercentNow: s.currentPct, crowdPercentForecast: s.predictedPct })), reorderNote }) },
          ],
          false,
          120
        )
      ).trim().replace(/\s+/g, ' ') || template;
    } catch {
      summary = template;
    }
  }

  return { intent, llmUsed, llmError, steps, skipped, summary, reordered, clock };
}

/** Re-check an active plan against the latest forecast; propose swaps for steps that got crowded. */
export async function checkPlan(steps: PlanStep[]) {
  const resources = await prisma.resource.findMany({ include: { sensors: true } });
  const engine = IoTSimulationEngine.getInstance();
  const forecasts = new Map<string, PredictionResult[]>();
  for (const r of resources) forecasts.set(r.id, engine.getLatestForecasts().get(r.id) ?? PredictionService.forecastSync(r, resources).predictions);
  const nowMinute = simClock.info().minuteOfDay;
  const ctx: Ctx = { resources, forecasts, nowMinute };

  const alerts = [];
  for (const [i, s] of steps.entries()) {
    if (s.endMinute <= nowMinute) continue;
    const r = resources.find((x) => x.id === s.resourceId);
    if (!r) continue;
    const ahead = Math.max(0, s.startMinute - nowMinute);
    const nowPred = Math.round(PredictionService.predictPctAtSync(r, ahead, resources, forecasts.get(r.id)));
    const closed = !r.isAvailable;
    if (closed || nowPred >= 85 || nowPred - s.predictedPct >= 15) {
      const task: PlanTask = { activity: s.activity, durationMinutes: s.endMinute - s.startMinute, seats: s.seats };
      const alt = candidatesFor(task, ctx, Math.max(nowMinute, s.startMinute), 70).find((c) => c.r.id !== r.id);
      alerts.push({
        stepIndex: i,
        resourceName: r.name,
        oldPredictedPct: s.predictedPct,
        newPredictedPct: closed ? 100 : nowPred,
        message: closed
          ? `${r.name} has been closed.`
          : `${r.name} is now forecast at ${nowPred}% for ${s.start} (was ${s.predictedPct}%).`,
        alternative: alt
          ? { resourceId: alt.r.id, resourceName: alt.r.name, resourceType: alt.r.type, building: alt.r.building, predictedPct: Math.round(alt.predicted), bookable: !NOT_BOOKABLE.has(alt.r.type) }
          : null,
      });
    }
  }
  return { checkedAt: simClock.info(), alerts };
}
