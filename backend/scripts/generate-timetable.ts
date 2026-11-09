/**
 * Generates a realistic, deterministic weekly class timetable (stand-in for an ERP export).
 * Output: src/data/timetable.json
 *
 *   npx tsx scripts/generate-timetable.ts
 */
import fs from 'fs';
import path from 'path';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2026);
const randint = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

const DEPTS: Record<string, string[]> = {
  CSE: ['Data Structures', 'Operating Systems', 'Computer Networks', 'Compiler Design', 'DBMS', 'Algorithms'],
  ECE: ['Signals & Systems', 'Digital Electronics', 'VLSI Design', 'Communication Systems', 'Microprocessors'],
  EEE: ['Power Systems', 'Electrical Machines', 'Control Systems', 'Power Electronics'],
  MECH: ['Thermodynamics', 'Fluid Mechanics', 'Machine Design', 'Manufacturing Processes'],
  CIVIL: ['Structural Analysis', 'Geotechnical Engineering', 'Surveying', 'Transportation Engg'],
  AIDS: ['Machine Learning', 'Deep Learning', 'Data Visualization', 'Big Data Analytics'],
};
const LAB_COURSES: Record<string, string[]> = {
  CSE: ['DS Lab', 'OS Lab', 'Networks Lab', 'DBMS Lab'],
  ECE: ['Digital Lab', 'Microprocessor Lab'],
  EEE: ['Simulation Lab'],
  MECH: ['CAD Lab'],
  CIVIL: ['GIS Lab'],
  AIDS: ['ML Lab', 'Data Lab'],
};
const deptNames = Object.keys(DEPTS);

const LECTURE_SLOTS = [540, 600, 660, 720, 840, 900, 960]; // 09:00..12:00, 14:00..16:00 (50 min)
const LAB_SLOTS = [540, 660, 840]; // 2-hour labs: 09:00, 11:00, 14:00 (110 min)

interface S {
  id: string; courseCode: string; title: string; department: string; roomCode: string;
  day: number; start: number; end: number; enrollment: number;
}
const sessions: S[] = [];
let n = 0;
const add = (dept: string, title: string, roomCode: string, day: number, start: number, dur: number, enrollment: number) => {
  n++;
  const code = `${dept}${200 + (Math.abs(title.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 300)}`;
  sessions.push({ id: `S${String(n).padStart(4, '0')}`, courseCode: code, title, department: dept, roomCode, day, start, end: start + dur, enrollment });
};

for (let day = 1; day <= 5; day++) {
  for (const slot of LECTURE_SLOTS) {
    // Wednesday afternoon is sports/club time; Friday 16:00 is light
    const light = (day === 3 && slot >= 840) || (day === 5 && slot === 960);
    // Block A (5 rooms, 150 seats total)
    let budgetA = 150 * 0.95;
    const nA = light ? randint(0, 1) : randint(2, 3);
    for (let i = 0; i < nA; i++) {
      const e = Math.min(randint(35, 60), Math.floor(budgetA));
      if (e < 20) break;
      budgetA -= e;
      const d = pick(deptNames);
      add(d, pick(DEPTS[d]), 'CLS-01', day, slot, 50, e);
    }
    // Block B (4 rooms, 120 seats total)
    let budgetB = 120 * 0.95;
    const nB = light ? randint(0, 1) : randint(1, 3);
    for (let i = 0; i < nB; i++) {
      const e = Math.min(randint(30, 50), Math.floor(budgetB));
      if (e < 20) break;
      budgetB -= e;
      const d = pick(deptNames);
      add(d, pick(DEPTS[d]), 'CLS-02', day, slot, 50, e);
    }
    // Seminar hall: combined lectures / guest talks
    if (!light && rand() < 0.3) {
      const d = pick(deptNames);
      add(d, `${pick(DEPTS[d])} (Combined Section)`, 'SEM-01', day, slot, 50, randint(90, 160));
    }
  }
  for (const slot of LAB_SLOTS) {
    const light = day === 3 && slot >= 840;
    for (const [lab, cap] of [['LAB-01', 80], ['LAB-02', 75], ['LAB-03', 60]] as [string, number][]) {
      if (light || rand() > 0.6) continue;
      const d = pick(deptNames);
      add(d, pick(LAB_COURSES[d]), lab, day, slot, 110, randint(Math.round(cap * 0.45), Math.round(cap * 0.8)));
    }
    if (!light && rand() < 0.4) {
      add('AIDS', pick(['GPU Computing Practicum', 'Research Methods Lab']), 'LAB-AI', day, slot, 110, randint(18, 35));
    }
  }
}

const out = {
  version: 'tt-2026-odd-v1',
  source: 'Generated sample (replace with ERP export: same JSON shape)',
  generatedAt: new Date().toISOString(),
  sessions: sessions.sort((a, b) => a.day - b.day || a.start - b.start || a.roomCode.localeCompare(b.roomCode)),
};

const file = path.join(__dirname, '..', 'src', 'data', 'timetable.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(out, null, 1));
console.log(`Wrote ${sessions.length} class sessions to ${file}`);
