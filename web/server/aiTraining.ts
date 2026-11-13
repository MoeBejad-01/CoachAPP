// Reads a coach's training file with Claude and returns structured training days.
// Runs on the server (Vite dev/preview middleware) so the API key never reaches the browser.

import type { IncomingMessage, ServerResponse } from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

const ExerciseSchema = z.object({
  name: z.string().describe('Exercise name exactly as written in the file (keep the original language).'),
  sets: z.number().int().describe('Number of working sets. Use the lower number of a range. 0 if the file does not say.'),
  reps: z.string().describe('Reps as written: "8", "8–10", "10/leg", "AMRAP", "30s". Empty if not given.'),
  intensity: z.string().describe('Load or effort as written: "RPE 8", "RIR 2", "75%", "80 kg", "BW". Empty if not given.'),
  rest: z.string().describe('Rest between sets, normalised to m:ss when it is a time ("2:00", "1:30"). Empty if not given.'),
  notes: z.string().describe('Coaching cues, tempo, superset or circuit pairing, side notes. Empty if none.'),
});

const ResultSchema = z.object({
  weeks: z.array(z.object({
    label: z.string().describe('Week label from the file, e.g. "Week 1". Empty when the file has no weeks.'),
    days: z.array(z.object({
      name: z.string().describe('Training day name as written, e.g. "Day 1 – Upper", "Monday", "Push".'),
      exercises: z.array(ExerciseSchema),
    })),
  })).describe('One entry per distinct week in the file. A file without weeks has exactly one entry.'),
  ignored: z.array(z.string()).describe('Short list of non-training content found and left out, e.g. "Meal plan", "Supplement list".'),
  warnings: z.array(z.string()).describe('Short notes on anything uncertain the coach should check, in the requested language.'),
});

export type AiTrainingResult = z.infer<typeof ResultSchema>;

const SYSTEM = `You convert a fitness coach's training program file into structured training data.

Every coach uses their own layout: spreadsheets with or without headers, one sheet per day, PDFs with tables or free text, photos of printed plans, English, Arabic or mixed. Read the whole file and work out its structure yourself.

Extract only the resistance and conditioning training: training days and the exercises in each, with sets, reps, intensity, rest and notes. Do not invent exercises or numbers that are not in the file. Leave a field empty when the file does not give it, and set sets to 0 when the number of sets is missing.

If the file programs several weeks differently, return each week separately in order. If the weeks repeat the same sessions, return a single week. Keep each day in the order it appears, and keep exercise order.

Supersets or circuits (A1/A2, "superset with"): list each exercise separately and mention the pairing in notes.

Nutrition, sleep, supplements, warm-up essays and general text are not training days; list them briefly in "ignored". Write "warnings" for anything ambiguous the coach should double-check.`;

type Body = { kind: 'pdf' | 'image' | 'sheet' | 'text'; fileName: string; mediaType?: string; data?: string; text?: string; language?: 'en' | 'ar' };
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
const MAX_BODY = 30 * 1024 * 1024;

function readJson(req: IncomingMessage): Promise<Body> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as Body); } catch { reject(new Error('bad_json')); } });
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function fileContent(b: Body): Anthropic.Beta.BetaContentBlockParam[] {
  if (b.kind === 'pdf' && b.data) return [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b.data } }];
  if (b.kind === 'image' && b.data && IMAGE_TYPES.includes(b.mediaType as ImageType)) {
    return [{ type: 'image', source: { type: 'base64', media_type: b.mediaType as ImageType, data: b.data } }];
  }
  if ((b.kind === 'sheet' || b.kind === 'text') && b.text) return [{ type: 'text', text: `<file name="${b.fileName}">\n${b.text}\n</file>` }];
  throw new Error('unsupported');
}

export async function handleAiTraining(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  let body: Body;
  try {
    body = await readJson(req);
  } catch (e) {
    return send(res, e instanceof Error && e.message === 'too_large' ? 413 : 400, { error: e instanceof Error ? e.message : 'bad_request' });
  }

  let client: Anthropic;
  try {
    client = new Anthropic();
  } catch {
    return send(res, 503, { error: 'no_key' });
  }

  let content: Anthropic.Beta.BetaContentBlockParam[];
  try {
    content = fileContent(body);
  } catch {
    return send(res, 400, { error: 'unsupported' });
  }
  const lang = body.language === 'ar' ? 'Arabic' : 'English';

  try {
    const response = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      // Re-runs on a fallback model inside the same call if the request is declined.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(ResultSchema) },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [...content, { type: 'text', text: `File name: ${body.fileName}. Extract the training program. Write warnings and ignored items in ${lang}; keep exercise and day names as written in the file.` }],
      }],
    });
    if (response.stop_reason === 'refusal') return send(res, 422, { error: 'refusal' });
    if (response.stop_reason === 'max_tokens') return send(res, 422, { error: 'too_long' });
    if (!response.parsed_output) return send(res, 502, { error: 'unparsed' });
    return send(res, 200, response.parsed_output);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return send(res, 401, { error: 'bad_key' });
    if (e instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'rate_limit' });
    if (e instanceof Anthropic.BadRequestError) return send(res, 400, { error: 'api_bad_request', detail: e.message });
    if (e instanceof Anthropic.APIError) return send(res, 502, { error: 'api', status: e.status, detail: e.message });
    // No credentials found at request time surfaces as a plain Error from the SDK.
    if (e instanceof Error && /api ?key|auth/i.test(e.message)) return send(res, 503, { error: 'no_key' });
    return send(res, 500, { error: 'unknown' });
  }
}
