/**
 * Occy — the conversational campus assistant behind the Smart Planner.
 *
 * Every message goes through a small "router" LLM call that sees:
 *   - the recent conversation,
 *   - a live snapshot of every campus space (occupancy now + forecasts),
 *   - a guide to the OCCUPRA app.
 * It either answers directly (greetings, questions about crowds or the app, follow-ups)
 * or hands a standalone planning request to the deterministic planner (buildPlan).
 */
import { prisma } from '../utils/prisma';
import { config } from '../config';
import { PredictionService, PredictionResult } from './predictionService';
import { IoTSimulationEngine } from '../simulation/engine';
import { simClock } from '../campus/clock';
import { DAY_NAMES, hhmm } from '../campus/time';
import { buildPlan, groqChat } from './agentService';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const LANG_NAME: Record<string, string> = { en: 'English', hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu' };

const APP_GUIDE = `OCCUPRA app guide (student side):
- Dashboard: campus overview and live stats.
- Campus Map: map of all spaces, colour-coded Quiet / Moderate / Crowded.
- Live Heatmap: crowd intensity across campus.
- Crowd Prediction: forecasts for +30 min, +1 h, +2 h, +4 h per space (timetable-aware AI).
- Smart Planner (this chat): plans free time across spaces and lets you book seats; keeps watching and suggests a switch if a place gets crowded.
- Find Best Space: pick a need (study, computer, group, food…), seats and max crowd; get the best match.
- My Bookings: see or cancel reservations. Notifications: crowd alerts and early-peak nudges.
- Settings (sidebar) has tabs: Account (name, department, phone, roll no), Password (change password: enter current + new password, 8+ chars with letters and numbers; shared demo accounts cannot change it), Theme (Dark/Light/System), Language (English, Hindi, Bengali, Tamil, Telugu), About Us.
- Voice: tap the mic in this chat to speak; replies can be read aloud.
Privacy: no cameras; headcounts come from door counters and anonymous Wi-Fi counts.`;

const ROUTER_PROMPT = (snapshot: string, now: string, replyLang: string, userName: string) => `You are Occy, the friendly robot assistant inside OCCUPRA, a smart-campus app. You talk with ${userName}, a student.
Current campus time: ${now}.

LIVE CAMPUS DATA (name|type|occupancy now|forecast in 1h|free seats|hours) — the only source for crowd facts:
${snapshot}

${APP_GUIDE}

Decide what the student wants and return ONLY JSON:
{"type":"chat","reply":"..."}  — for greetings, small talk, questions about crowds/spaces/opening hours, how to use the app, or anything else.
{"type":"plan","request":"...","reply":"..."} — ONLY when they want you to plan or schedule activities (study, eat, lab, print, meet, etc.).
  "request" = a standalone English description of the plan, merging details from earlier messages (e.g. "make it 2 hours" → full request with 2 hours). "reply" = one short friendly line like "On it — planning that now!".

Rules for "reply":
- Write in ${replyLang}. Be warm, concise (1–3 short sentences), and helpful. Keep place names as given.
- For crowd questions use ONLY the live data above (say "now X%" / "forecast Y% in 1 hour"); recommend the quietest suitable option.
- If a space is closed now, say so with its hours.
- Small talk (thanks, how are you, jokes) is fine — keep it short and friendly.
- For factual questions unrelated to campus (news, sports results, people, history, etc.) do NOT state facts: say kindly that you can't check live facts outside campus, then offer campus help.
- Never invent campus facts, rooms, numbers or app features.
- No markdown, no lists with symbols.`;

function snapshotText(resources: any[], forecasts: Map<string, PredictionResult[]>): string {
  // Compact on purpose: Groq's free tier allows ~8k tokens/minute per model
  return resources
    .map((r) => {
      const f = forecasts.get(r.id) || [];
      const p1 = f.find((x) => x.timeOffsetMinutes === 60)?.predictedPercent;
      const open = (r.openingTime || '').replace(':00', '').replace(' ', '') + '-' + (r.closingTime || '').replace(':00', '').replace(' ', '');
      return `${r.name}|${r.type.toLowerCase()}|now ${Math.round(r.occupancyPercent)}%|1h ${p1 !== undefined ? Math.round(p1) + '%' : '?'}|${r.availableUnits} free|${open}${r.isAvailable ? '' : '|CLOSED'}`;
    })
    .join('\n');
}

const sanitizeHistory = (messages: unknown): ChatMessage[] =>
  (Array.isArray(messages) ? messages : [])
    .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-10)
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 800) }));

/** Offline fallback when Groq is unavailable */
function offlineReply(text: string): { type: 'chat' | 'plan'; reply: string } {
  const t = text.toLowerCase();
  const faq: [RegExp, string][] = [
    [/password/, 'Go to Settings → Password, enter your current password and a new one (8+ characters with letters and numbers).'],
    [/(theme|dark|light mode)/, 'Go to Settings → Theme and pick Dark, Light or System.'],
    [/(language|hindi|tamil|telugu|bengali)/, 'Go to Settings → Language and choose English, हिन्दी, বাংলা, தமிழ் or తెలుగు.'],
    [/(cancel|my booking|bookings)/, 'Open My Bookings in the sidebar to see or cancel your reservations.'],
    [/(map|where is)/, 'Open Campus Map in the sidebar — spaces are coloured Quiet, Moderate or Crowded.'],
    [/(predict|forecast)/, 'Open Crowd Prediction to see +30 min to +4 h forecasts for every space.'],
  ];
  for (const [re, answer] of faq) if (re.test(t)) return { type: 'chat', reply: answer };
  if (/\b(hi|hello|hey|namaste|vanakkam)\b/.test(t)) return { type: 'chat', reply: 'Hi! I’m Occy. Tell me what you need to do — like “2 hours of study, then lunch” — and I’ll plan it around the crowds.' };
  if (/(study|lunch|eat|food|lab|print|meeting|plan|hours?)/.test(t)) return { type: 'plan', reply: 'On it — planning that now!' };
  return { type: 'chat', reply: 'I’m a bit busy right now, but I’m best at campus things: crowds, finding a quiet spot and planning your free time. What would you like to do?' };
}

export async function chat(messagesIn: unknown, lang: string, userName = 'there') {
  const history = sanitizeHistory(messagesIn);
  const last = [...history].reverse().find((m) => m.role === 'user');
  if (!last) return { type: 'chat' as const, reply: 'Hi! I’m Occy. How can I help you on campus today?' };

  const resources = await prisma.resource.findMany({ include: { sensors: true }, orderBy: { name: 'asc' } });
  const engine = IoTSimulationEngine.getInstance();
  const forecasts = new Map<string, PredictionResult[]>();
  for (const r of resources) forecasts.set(r.id, engine.getLatestForecasts().get(r.id) ?? PredictionService.forecastSync(r, resources).predictions);
  const clock = simClock.info();
  const now = `${DAY_NAMES[clock.dow]} ${hhmm(clock.minuteOfDay)}`;
  const replyLang = LANG_NAME[lang] ?? 'English';

  let decision: { type: 'chat' | 'plan'; reply: string; request?: string };
  let llmUsed = false;
  if (config.groqApiKey) {
    try {
      const indic = lang !== 'en' || /[ऀ-෿]/.test(last.content);
      const out = await groqChat(
        [{ role: 'system', content: ROUTER_PROMPT(snapshotText(resources, forecasts), now, replyLang, userName) }, ...history],
        true,
        500,
        indic ? 'openai/gpt-oss-120b' : undefined
      );
      const parsed = JSON.parse(out);
      const type = parsed.type === 'plan' ? 'plan' : 'chat';
      decision = {
        type,
        reply: String(parsed.reply ?? '').trim().slice(0, 900) || (type === 'plan' ? 'Planning that now!' : 'How can I help?'),
        request: typeof parsed.request === 'string' ? parsed.request.slice(0, 600) : undefined,
      };
      llmUsed = true;
    } catch (err: any) {
      console.warn('[chat] router failed, using offline reply:', err?.message);
      decision = offlineReply(last.content);
    }
  } else {
    decision = offlineReply(last.content);
  }

  if (decision.type === 'plan') {
    const plan = await buildPlan(decision.request || last.content, lang);
    if (plan.steps.length || plan.skipped?.length) return { type: 'plan' as const, reply: decision.reply, plan, llmUsed };
    // Planner found nothing actionable → answer conversationally instead of an empty plan
    return { type: 'chat' as const, reply: plan.summary, llmUsed };
  }
  return { type: 'chat' as const, reply: decision.reply, llmUsed };
}
