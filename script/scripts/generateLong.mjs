#!/usr/bin/env node
/**
 * Generate 5-mark long questions from HTML in input/ → output/{name}-long-questions.json
 *
 * - Put .html files in script/input/ or pass a path to one file
 * - --sync copies to long-questions/vistuallization/public/courses/ and updates index.json
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { parseLessonsFromHtml } from '../lib/parseLessons.mjs';
import { listHtmlFiles, syncToViz, workspaceRoot } from '../lib/syncViz.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptRoot = path.join(__dirname, '..');
const repoRoot = workspaceRoot();
dotenv.config({ path: path.join(repoRoot, '.env'), quiet: true });

const inputDir = path.join(scriptRoot, 'input');
const outDir = path.join(scriptRoot, 'output');

function argLesson() {
  const a = process.argv.find((x) => x.startsWith('--lesson='));
  if (!a) return null;
  return parseInt(a.split('=')[1], 10);
}

function resolveHtmlFiles() {
  const explicit = process.argv.find(
    (x) => !x.startsWith('--') && x.toLowerCase().endsWith('.html')
  );
  if (explicit) return [path.resolve(process.cwd(), explicit)];
  return listHtmlFiles(inputDir);
}

function estimatedLongCount(charLen) {
  if (charLen < 2500) return { min: 1, max: 2, target: 1 };
  if (charLen < 8000) return { min: 1, max: 3, target: 2 };
  if (charLen < 20000) return { min: 2, max: 4, target: 2 };
  return { min: 2, max: 4, target: 3 };
}

const SYSTEM = `You generate Virtual University (Pakistan) style exam questions for ACC311 Fundamentals of Auditing.
These are **5-mark** questions: a bit deeper than 3-mark shorts, but NOT long essays. Typical length: short intro + 2–4 developed points (lists OK).
Rules:
- Use ONLY the lecture text provided. Do not add facts not supported by the text.
- Questions should invite brief explanation, comparison, discussion, or "outline the main…" style appropriate for 5 marks.
- Each answer must be accurate and proportional to 5 marks (substantive but concise).
- Every question object must include "marks": 5.
- Output must be valid JSON only, no markdown fences.`;

function userPayload(lesson) {
  const { min, max, target } = estimatedLongCount(lesson.plainText.length);
  return `Lecture metadata:
- lessonNumber: ${lesson.lessonNumber}
- lessonId: "${lesson.lessonId}"
- title: "${lesson.title.replace(/"/g, '\\"')}"

Produce between ${min} and ${max} long questions (aim ~${target} for this amount of text). Each is worth **5 marks**.

Lecture text:
---
${lesson.plainText}
---

Return a single JSON object with exactly this shape:
{
  "lessonNumber": <number>,
  "lessonId": <string>,
  "title": <string>,
  "longQuestions": [
    {
      "id": <string, e.g. "l01-lq01">,
      "marks": 5,
      "question": <string>,
      "answerBlocks": <array of blocks>
    }
  ]
}

Each block is ONE of:
{ "type": "paragraph", "text": "<string, **bold** and *italic* allowed>" }
{ "type": "bulletList", "items": ["<string>", "..."] }
{ "type": "orderedList", "items": ["<string>", "..."] }
{ "type": "table", "headers": ["..."], "rows": [["...", "..."], "..."] }

Use multiple blocks when helpful. Prefer a short opening paragraph then bulletList for main points.`;
}

async function generateLecture(client, lesson, model) {
  const useChat = process.env.OPENAI_API_MODE === 'chat';

  if (useChat) {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userPayload(lesson) },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('Empty chat completion');
    return JSON.parse(raw);
  }

  const response = await client.responses.create({
    model,
    instructions: SYSTEM,
    input: userPayload(lesson),
    temperature: 0.35,
    max_output_tokens: 16384,
    text: { format: { type: 'json_object' } },
  });

  if (response.status && response.status !== 'completed') {
    const err = response.error?.message || response.incomplete_details || response.status;
    throw new Error(`Responses API: ${err}`);
  }

  const raw = response.output_text;
  if (!raw?.trim()) throw new Error('Empty response.output_text');
  return JSON.parse(raw);
}

function mockLectureJson(lesson) {
  const n = lesson.lessonNumber;
  const pad = String(n).padStart(2, '0');
  return {
    lessonNumber: n,
    lessonId: lesson.lessonId,
    title: lesson.title,
    longQuestions: [
      {
        id: `l${pad}-lq01`,
        marks: 5,
        question: `[Mock — 5 marks] Explain a main theme from "${lesson.title.slice(0, 50)}…" using only the lecture text.`,
        answerBlocks: [
          {
            type: 'paragraph',
            text: 'Replace by running `npm run generate` with API access. **5-mark** answers: short paragraph plus bullets where useful.',
          },
          {
            type: 'bulletList',
            items: ['First developed point (mock)', 'Second point with *emphasis* (mock)'],
          },
        ],
      },
    ],
  };
}

async function processOneHtml(htmlPath, opts) {
  const { dry, useMock, lessonFilter, courseCode, model, client, doSync } = opts;

  if (!fs.existsSync(htmlPath)) {
    console.error('HTML not found:', htmlPath);
    return;
  }

  let lectures = parseLessonsFromHtml(htmlPath);
  if (lessonFilter != null && !Number.isNaN(lessonFilter)) {
    lectures = lectures.filter((L) => L.lessonNumber === lessonFilter);
    if (!lectures.length) {
      console.error('No lecture with number', lessonFilter, 'in', htmlPath);
      return;
    }
  }

  const baseName = path.basename(htmlPath, '.html');
  const outFile = path.join(outDir, `${baseName}-long-questions.json`);
  const sourceFile = path.relative(repoRoot, htmlPath).replace(/\\/g, '/');

  console.log(`\n── ${baseName}.html → ${path.basename(outFile)} (${lectures.length} lectures) ──`);

  if (dry) {
    for (const L of lectures) {
      const est = estimatedLongCount(L.plainText.length);
      console.log(
        `  L${L.lessonNumber} ${L.lessonId} | ${L.plainText.length} chars | long Q ${est.min}-${est.max} (≈${est.target})`
      );
    }
    return;
  }

  const payload = {
    courseCode,
    sourceHtml: sourceFile,
    questionType: 'long',
    marksPerQuestion: 5,
    generatedAt: new Date().toISOString(),
    model,
    lessons: [],
  };

  if (useMock) {
    for (const lec of lectures) {
      console.log(`  Mock L${lec.lessonNumber} (${lec.lessonId})`);
      payload.lessons.push(mockLectureJson(lec));
    }
  } else {
    for (const lec of lectures) {
      console.log(`  Generating long Q — L${lec.lessonNumber} (${lec.lessonId})…`);
      const part = await generateLecture(client, lec, model);
      payload.lessons.push(part);
    }
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log('  Wrote', outFile);

  if (doSync) syncToViz(repoRoot, outFile, 'long');
}

async function main() {
  const dry = process.argv.includes('--dry-run');
  const useMock = process.argv.includes('--mock');
  const doSync = process.argv.includes('--sync');
  const lessonFilter = argLesson();

  const htmlFiles = resolveHtmlFiles();
  if (!htmlFiles.length) {
    console.error(
      'No HTML input. Add .html file(s) to:\n  ',
      inputDir,
      '\n  Or run: node scripts/generateLong.mjs path/to/file.html'
    );
    process.exit(1);
  }

  console.log('HTML files:', htmlFiles.map((p) => path.relative(repoRoot, p)).join(', '));

  const courseCode = process.env.COURSE_CODE || 'ACC311';
  const model = useMock ? 'mock' : process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  let client = null;
  if (!dry && !useMock) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      console.error('Missing OPENAI_API_KEY in .env at workspace root:', repoRoot);
      process.exit(1);
    }
    client = new OpenAI({ apiKey: key });
  }

  fs.mkdirSync(inputDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  for (const htmlPath of htmlFiles) {
    await processOneHtml(htmlPath, {
      dry,
      useMock,
      lessonFilter,
      courseCode,
      model,
      client,
      doSync,
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
