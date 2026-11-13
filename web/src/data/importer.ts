// Turns a coach's own training file (Excel/CSV sheet or PDF) into program days.
// There is no standard format, so everything here is a best guess that the
// coach can correct: column roles for sheets, line roles for PDFs.

import { uid } from '../lib/util';
import type { Exercise, ProgramDay } from './types';

export type ColRole = 'ignore' | 'day' | 'exercise' | 'sets' | 'reps' | 'setsReps' | 'intensity' | 'rest' | 'notes';
export const COL_ROLES: ColRole[] = ['ignore', 'day', 'exercise', 'sets', 'reps', 'setsReps', 'intensity', 'rest', 'notes'];
export type SplitMode = 'column' | 'sheets' | 'titles';

export interface SheetData { name: string; rows: string[][] }
export interface SheetMapping { headerRow: number; roles: ColRole[]; split: SplitMode }
export interface ImportResult { days: ProgramDay[]; skipped: string[] }

export type LineRole = 'day' | 'exercise' | 'ignore';
export interface TaggedLine { text: string; role: LineRole }

// ---------- Reading files ----------

export async function readSheets(file: File): Promise<SheetData[]> {
  const XLSX = await import('xlsx');
  // CSV text is decoded as UTF-8 so Arabic and other scripts survive (Excel files carry their own encoding).
  const isCsv = /\.(csv|txt)$/i.test(file.name) || file.type === 'text/csv';
  const wb = isCsv
    ? XLSX.read(new TextDecoder('utf-8').decode(await file.arrayBuffer()).replace(/^\uFEFF/, ''), { type: 'string' })
    : XLSX.read(await file.arrayBuffer(), { type: 'array' });
  return wb.SheetNames.map((name) => {
    const raw = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: false, defval: '', blankrows: true });
    const rows = raw.map((r) => r.map((c) => String(c ?? '').trim()));
    // Trim trailing empty rows and columns.
    while (rows.length && rows.at(-1)!.every((c) => !c)) rows.pop();
    const width = Math.max(0, ...rows.map((r) => r.reduce((w, c, i) => (c ? i + 1 : w), 0)));
    return { name, rows: rows.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? '')) };
  }).filter((s) => s.rows.length > 0);
}

/** Text lines of a PDF, rebuilt from positioned text items (top to bottom, left to right). */
export async function readPdfLines(file: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const rows = new Map<number, { x: number; s: string; w: number }[]>();
    for (const it of content.items) {
      if (!('str' in it) || !it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3) * 3;
      const row = rows.get(y) ?? [];
      row.push({ x: it.transform[4], s: it.str, w: it.width });
      rows.set(y, row);
    }
    for (const y of [...rows.keys()].sort((a, b) => b - a)) {
      const parts = rows.get(y)!.sort((a, b) => a.x - b.x);
      // A wide gap between items is a column break; keep it as a double space.
      let line = '';
      let end = -Infinity;
      for (const it of parts) {
        line += line ? (it.x - end > 12 ? '  ' : it.x - end > 1 ? ' ' : '') + it.s : it.s;
        end = it.x + it.w;
      }
      if (line.trim()) lines.push(line.trim());
    }
  }
  return lines;
}

// ---------- Recognising values ----------

const SETS_REPS = /(\d{1,2})\s*(?:sets?\s*)?[x×X*]\s*(\d{1,3}(?:\s*[-–]\s*\d{1,3})?(?:\s*(?:reps?|each|\/leg|\/side))?|amrap|max)/i;
const SETS_OF = /(\d{1,2})\s*sets?\s*(?:of)?\s*(\d{1,3}(?:\s*[-–]\s*\d{1,3})?)\s*(?:reps?)?/i;
const INTENSITY = /(RPE\s*\d+(?:\.\d)?(?:\s*[-–]\s*\d+(?:\.\d)?)?|RIR\s*\d+(?:\s*[-–]\s*\d+)?|@?\s*\d{2,3}\s*%(?:\s*(?:of\s*)?1\s*RM)?|@\s*\d+(?:\.\d+)?\s*(?:kg|lbs?)?|\d+(?:\.\d+)?\s*(?:kg|lbs?)\b|bodyweight|BW\b)/i;
const REST = /(\d{1,2}:\d{2}|\d+(?:\.\d+)?\s*(?:s|sec|secs|seconds|min|mins|minutes|m)\b|\d+\s*(?:ثانية|ث|دقيقة|دقائق|د)(?=\s|$))/i;
// Week headings ("Week 1") are not days, so they are left out on purpose.
// `\b` only sees Latin letters, so the end of the word is checked with a Unicode letter test.
const DAY_WORDS = /^(day|session|workout|upper|lower|push|pull|legs|full[\s-]?body|chest|back|arms|shoulders|conditioning|training|wod|يوم|اليوم|الحصة|حصة|تمرين\s+\S+)(?!\p{L})/iu;
const BULLET = /^\s*(?:[-•*·▪●]|\(?[A-Za-z]?\d{1,2}[.)]|[A-Z][.)])\s*/;

const clean = (s: string) => s.replace(BULLET, '').replace(/\s{2,}/g, ' ').replace(/[\s:–\-|,]+$/, '').trim();

export function splitSetsReps(s: string): { sets: number; reps: string } | null {
  const m = s.match(SETS_REPS) ?? s.match(SETS_OF);
  return m ? { sets: Number(m[1]), reps: m[2].replace(/\s+/g, '').replace('-', '–') } : null;
}

/** "Back squat 4x6 RPE 8 2:00 brace hard" → exercise; null when the line isn't one. */
export function parseExerciseLine(line: string): Exercise | null {
  const text = line.replace(/\s+/g, ' ').trim();
  let name = '';
  let sets = 0;
  let reps = '';
  let rest = text;
  const m = text.match(SETS_REPS) ?? text.match(SETS_OF);
  if (m && m.index !== undefined && m.index > 0) {
    name = text.slice(0, m.index);
    sets = Number(m[1]);
    reps = m[2].replace(/\s+/g, '').replace('-', '–');
    rest = text.slice(m.index + m[0].length);
  } else {
    // Table-style line: name, then sets and reps as separate columns.
    const t = line.match(/^(.*?[^\d\s].*?)\s{2,}(\d{1,2})\s{1,}(\d{1,3}(?:\s*[-–]\s*\d{1,3})?)(?:\s+(.*))?$/) ?? text.match(/^(\D[^\d]*?)\s+(\d{1,2})\s+(\d{1,3}(?:\s*[-–]\s*\d{1,3})?)(?:\s+(.*))?$/);
    if (!t) return null;
    name = t[1];
    sets = Number(t[2]);
    reps = t[3].replace(/\s+/g, '').replace('-', '–');
    rest = t[4] ?? '';
  }
  name = clean(name);
  if (!name || name.length > 60 || !/[A-Za-z؀-ۿ]/.test(name) || sets < 1 || sets > 20) return null;
  const intensity = rest.match(INTENSITY)?.[0] ?? '';
  const restTime = rest.replace(intensity, ' ').match(REST)?.[0] ?? '';
  const cue = clean(rest.replace(intensity, ' ').replace(restTime, ' ').replace(/\b(rest|recovery)\b|راحة/gi, ' '));
  return { id: uid('e'), name, sets, reps: reps || '8', intensity: intensity.replace(/\s+/g, ' ').replace(/^@\s*(?=\d+\s*%)/, '').trim(), rest: restTime.replace(/\s+/g, ''), cue };
}

// ---------- Sheets ----------

const SYN: [ColRole, RegExp][] = [
  ['setsReps', /^(sets?\s*[x×*\/]\s*reps?|scheme|prescription|volume|الجولات\s*[x×]\s*التكرار)$/i],
  ['day', /^(day|session|workout|day\s*name|يوم|اليوم|الحصة)$/i],
  ['exercise', /^(exercise|exercises|movement|lift|name|exercise\s*name|drill|التمرين|تمرين|الحركة)$/i],
  ['sets', /^(sets?|#\s*sets|series|الجولات|المجموعات|جولات)$/i],
  ['reps', /^(reps?|repetitions|rep\s*range|التكرار|تكرارات|العدات)$/i],
  ['intensity', /^(intensity|rpe|rir|load|weight|%|%\s*1rm|kg|effort|الشدة|الوزن|الحمل)$/i],
  ['rest', /^(rest|rest\s*\(.*\)|recovery|break|الراحة|راحة)$/i],
  ['notes', /^(notes?|cues?|coaching\s*cues?|tempo|comments?|instructions?|ملاحظات|ملاحظة|إرشادات)$/i],
];

const roleOfHeader = (h: string): ColRole | null => SYN.find(([, re]) => re.test(h.trim()))?.[0] ?? null;

/** Header row = the early row that matches the most known column names. */
export function guessMapping(sheets: SheetData[]): SheetMapping {
  const rows = sheets[0]?.rows ?? [];
  let headerRow = -1;
  let best = 1;
  rows.slice(0, 15).forEach((r, i) => {
    const hits = r.filter((c) => c && roleOfHeader(c)).length;
    if (hits > best) { best = hits; headerRow = i; }
  });
  const width = Math.max(0, ...rows.map((r) => r.length));
  const roles: ColRole[] = Array.from({ length: width }, (_, c) => (headerRow >= 0 ? roleOfHeader(rows[headerRow][c] ?? '') : null) ?? 'ignore');
  if (!roles.includes('exercise')) guessByContent(rows.slice(headerRow + 1), roles);
  const split: SplitMode = roles.includes('day') ? 'column' : sheets.length > 1 ? 'sheets' : 'titles';
  return { headerRow, roles, split };
}

/** Without headers, look at what the cells contain. */
function guessByContent(rows: string[][], roles: ColRole[]) {
  const score = (c: number, test: (v: string) => boolean) => rows.filter((r) => r[c] && test(r[c])).length;
  const taken = new Set(roles.map((r, i) => (r !== 'ignore' ? i : -1)));
  const pick = (role: ColRole, test: (v: string) => boolean, min = 2) => {
    let bestC = -1;
    let bestS = min - 1;
    roles.forEach((_, c) => { if (!taken.has(c)) { const s = score(c, test); if (s > bestS) { bestS = s; bestC = c; } } });
    if (bestC >= 0) { roles[bestC] = role; taken.add(bestC); }
  };
  pick('setsReps', (v) => SETS_REPS.test(v));
  pick('exercise', (v) => /[A-Za-z؀-ۿ]{3}/.test(v) && !SETS_REPS.test(v) && !INTENSITY.test(v) && v.length < 60);
  if (!roles.includes('setsReps')) {
    pick('sets', (v) => /^\d{1,2}$/.test(v) && Number(v) <= 10);
    pick('reps', (v) => /^\d{1,3}(\s*[-–]\s*\d{1,3})?$/.test(v));
  }
  pick('intensity', (v) => INTENSITY.test(v));
  pick('rest', (v) => /^\s*(\d{1,2}:\d{2}|\d+\s*(s|sec|min|m))\s*$/i.test(v));
}

export const headerSignature = (sheets: SheetData[], headerRow: number) =>
  headerRow < 0 ? '' : (sheets[0]?.rows[headerRow] ?? []).map((c) => c.toLowerCase().replace(/\s+/g, ' ').trim()).join('|');

const isHeaderLike = (row: string[], header: string[] | undefined) => !!header && row.join('|').toLowerCase() === header.join('|').toLowerCase();

export function applyMapping(sheets: SheetData[], m: SheetMapping, dayLabel: (n: number) => string): ImportResult {
  const days: ProgramDay[] = [];
  const skipped: string[] = [];
  const col = (role: ColRole) => m.roles.indexOf(role);
  const [cDay, cEx, cSets, cReps, cSR, cInt, cRest, cNotes] = (['day', 'exercise', 'sets', 'reps', 'setsReps', 'intensity', 'rest', 'notes'] as ColRole[]).map(col);
  const header = m.headerRow >= 0 ? sheets[0]?.rows[m.headerRow] : undefined;
  const dayNamed = (name: string) => {
    const key = name.trim().toLowerCase();
    let d = days.find((x) => x.name.trim().toLowerCase() === key);
    if (!d) { d = { id: uid('d'), name: name.trim() || dayLabel(days.length + 1), exercises: [] }; days.push(d); }
    return d;
  };
  let current: ProgramDay | null = null;

  for (const [si, sheet] of sheets.entries()) {
    if (m.split === 'sheets') current = dayNamed(sheet.name);
    const start = si === 0 ? m.headerRow + 1 : 0;
    // A day title just above the column titles ("Day 1" then the header row) names the first day.
    if (si === 0 && m.split === 'titles' && m.headerRow > 0) {
      const above = sheet.rows.slice(0, m.headerRow).reverse().find((r) => r.some(Boolean));
      const filled = above?.filter(Boolean) ?? [];
      if (filled.length >= 1 && filled.length <= 2 && DAY_WORDS.test(filled[0])) current = dayNamed(filled.join(' – '));
    }
    for (const row of sheet.rows.slice(start)) {
      if (row.every((c) => !c) || isHeaderLike(row, header)) continue;
      const get = (c: number) => (c >= 0 ? row[c] ?? '' : '');
      const name = get(cEx);
      const sr = splitSetsReps(get(cSR)) ?? splitSetsReps(get(cSets));
      const sets = sr?.sets ?? (Number(get(cSets).match(/\d+/)?.[0]) || 0);
      const reps = sr?.reps ?? get(cReps).replace(/\s+/g, '');
      const hasData = !!(sets || reps || get(cInt) || get(cRest));

      if (m.split === 'column' && get(cDay)) current = dayNamed(get(cDay));
      // A row with text but no numbers starts a new day ("Day 2 – Lower", "Upper A").
      const filled = row.filter(Boolean);
      if (m.split === 'titles' && !hasData && filled.length >= 1 && filled.length <= 2 && (DAY_WORDS.test(filled[0]) || !name || filled.length === 1)) {
        current = dayNamed(filled.join(' – '));
        continue;
      }
      if (!name || !hasData) { skipped.push(filled.join(' · ')); continue; }
      if (!current) current = dayNamed(dayLabel(days.length + 1));
      current.exercises.push({
        id: uid('e'), name: clean(name), sets: Math.min(20, Math.max(1, sets || 3)), reps: (reps || '8').replace('-', '–'),
        intensity: get(cInt), rest: get(cRest).replace(/\s+/g, ''), cue: get(cNotes),
      });
    }
  }
  return { days: days.filter((d) => d.exercises.length > 0), skipped: skipped.filter(Boolean) };
}

// ---------- PDF lines ----------

export function tagLines(lines: string[]): TaggedLine[] {
  const tagged: TaggedLine[] = lines.map((text) => ({ text, role: parseExerciseLine(text) ? 'exercise' : 'ignore' }));
  // Day titles: short lines with day words, or short text lines directly before exercises.
  tagged.forEach((l, i) => {
    if (l.role !== 'ignore') return;
    const t = l.text.trim();
    const short = t.length <= 40 && !/\d{1,2}\s*[x×]/.test(t);
    const nextIsExercise = tagged.slice(i + 1).find((x) => x.text.trim())?.role === 'exercise';
    if (short && !/^(week|الأسبوع)(?!\p{L})/iu.test(t) && (DAY_WORDS.test(t) || (nextIsExercise && /^[^\d]*\d?[^\d]*$/.test(t) && t.split(' ').length <= 6))) l.role = 'day';
  });
  return tagged;
}

export function linesToDays(lines: TaggedLine[], dayLabel: (n: number) => string): ImportResult {
  const days: ProgramDay[] = [];
  const skipped: string[] = [];
  let current: ProgramDay | null = null;
  for (const l of lines) {
    if (l.role === 'day') {
      current = { id: uid('d'), name: clean(l.text) || dayLabel(days.length + 1), exercises: [] };
      days.push(current);
    } else if (l.role === 'exercise') {
      const ex = parseExerciseLine(l.text) ?? { id: uid('e'), name: clean(l.text), sets: 3, reps: '8', intensity: '', rest: '', cue: '' };
      if (!current) { current = { id: uid('d'), name: dayLabel(days.length + 1), exercises: [] }; days.push(current); }
      current.exercises.push(ex);
    } else if (l.text.trim()) skipped.push(l.text);
  }
  return { days: days.filter((d) => d.exercises.length > 0), skipped };
}

/** A small example sheet coaches can download if they have no file yet. */
export async function downloadExample(dayWord: string) {
  const XLSX = await import('xlsx');
  const rows = [
    ['Day', 'Exercise', 'Sets', 'Reps', 'Intensity', 'Rest', 'Notes'],
    [`${dayWord} 1`, 'Back squat', 4, '6-8', 'RPE 8', '2:30', 'Brace, sit between the hips'],
    [`${dayWord} 1`, 'Romanian deadlift', 3, '8-10', 'RPE 7', '2:00', ''],
    [`${dayWord} 1`, 'Walking lunge', 3, '10/leg', 'RPE 8', '1:30', ''],
    [`${dayWord} 2`, 'Bench press', 4, '6-8', '75%', '2:30', 'Pause on the chest'],
    [`${dayWord} 2`, 'Chest-supported row', 4, '8-10', 'RPE 8', '2:00', ''],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Training');
  XLSX.writeFile(wb, 'training-example.xlsx');
}

// ---------- AI reading ----------

export interface AiWeek { label: string; days: ProgramDay[] }
export interface AiResult { weeks: AiWeek[]; ignored: string[]; warnings: string[]; missingSets: number }
export type AiError = 'no_key' | 'bad_key' | 'rate_limit' | 'refusal' | 'too_long' | 'too_large' | 'unsupported' | 'network' | 'failed';

const toBase64 = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

/** Sends the file to the server, which asks Claude to read it. Spreadsheets go as text, PDFs and photos as-is. */
export async function readWithAi(file: File, language: 'en' | 'ar'): Promise<AiResult> {
  const name = file.name;
  let body: Record<string, unknown>;
  if (/\.pdf$/i.test(name) || file.type === 'application/pdf') body = { kind: 'pdf', data: await toBase64(file) };
  else if (/^image\//.test(file.type)) body = { kind: 'image', mediaType: file.type, data: await toBase64(file) };
  else if (/\.(txt|md)$/i.test(name)) body = { kind: 'text', text: await file.text() };
  else {
    const XLSX = await import('xlsx');
    const sheets = await readSheets(file);
    const ws = (rows: string[][]) => XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows));
    body = { kind: 'sheet', text: sheets.map((s) => `### Sheet: ${s.name}\n${ws(s.rows)}`).join('\n\n') };
  }
  let res: Response;
  try {
    res = await fetch('/api/ai/parse-training', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, fileName: name, language }) });
  } catch {
    throw new Error('network' satisfies AiError);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const known: AiError[] = ['no_key', 'bad_key', 'rate_limit', 'refusal', 'too_long', 'too_large', 'unsupported'];
    throw new Error(known.includes(json.error) ? json.error : res.status === 413 ? 'too_large' : 'failed');
  }
  type Raw = { weeks: { label: string; days: { name: string; exercises: { name: string; sets: number; reps: string; intensity: string; rest: string; notes: string }[] }[] }[]; ignored: string[]; warnings: string[] };
  const raw = json as Raw;
  let missingSets = 0;
  const weeks = raw.weeks.map((w) => ({
    label: w.label,
    days: w.days.filter((d) => d.exercises.length).map((d, i) => ({
      id: uid('d'),
      name: d.name.trim() || `Day ${i + 1}`,
      exercises: d.exercises.map((e) => {
        if (!e.sets) missingSets++;
        return { id: uid('e'), name: e.name.trim(), sets: Math.min(20, Math.max(1, e.sets || 3)), reps: (e.reps || '8').replace('-', '–'), intensity: e.intensity, rest: e.rest, cue: e.notes };
      }),
    })),
  })).filter((w) => w.days.length);
  return { weeks, ignored: raw.ignored ?? [], warnings: raw.warnings ?? [], missingSets };
}
