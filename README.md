# Long questions (5 marks) — ACC311

This folder mirrors **short-questions**: a **generator** (`script/`) and a **React viewer** (`vistuallization/`). Long items are **5-mark** questions (deeper than 3-mark shorts, not full essays).

---

## Prerequisites

- Workspace root is the parent of `long-questions/` (the `aa` folder with `.env` and `newHtml/`).
- **`OPENAI_API_KEY`** in `aa/.env` (optional: `OPENAI_MODEL`, e.g. `gpt-4.1-mini`).
- Node.js 18+.

---

## 1. Generator — `script/`

### Folders

| Path | Purpose |
|------|--------|
| `script/input/` | Handout **`.html`** files (one or many). |
| `script/output/` | Generated JSON (`*.json` gitignored; folder kept with `.gitkeep`). |

**Output file name:** `input/{basename}.html` → `output/{basename}-long-questions.json`  
Example: `input/demo.html` → `output/demo-long-questions.json`.

### Commands

From **`long-questions/script/`**:

```bash
cd long-questions/script
npm install
```

| Command | What it does |
|---------|----------------|
| `npm run dry-run` | Per lecture: estimated **long** question count range (no API). |
| `npm run generate` | OpenAI: long questions for each HTML in `input/` → `output/`. |
| `npm run generate:mock` | Mock JSON, no API. |
| `npm run generate:sync` | Same as `generate`, plus **--sync** (copy to `vistuallization/public/courses/` and update `index.json`). |
| `npm run generate:one` | Shortcut for `--lesson=1`; adjust in `package.json` or use CLI. |

Mock + sync (no API):

```bash
node scripts/generateLong.mjs --mock --sync
```

### CLI flags

- `--dry-run` — print long-question count estimates only.
- `--mock` — mock output.
- `--sync` — copy written JSON to `vistuallization/public/courses/` and append `index.json` if needed.
- `--lesson=N` — restrict to one lecture number per HTML file.
- Single file: `node scripts/generateLong.mjs path/to/file.html`

### Long question counts (built into the prompt)

Roughly **1–4** long questions per lecture depending on text length; **~2** is typical for medium-sized lectures.

### Environment variables

Same as short generator: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_API_MODE=chat`, `COURSE_CODE`, `COURSE_TITLE`.

---

## 2. Visualization — `vistuallization/`

- **`public/courses/index.json`** — course cards.
- **`public/courses/*.json`** — long-question banks (`longQuestions` array).

### Run

```bash
cd long-questions/vistuallization
npm install
npm run dev
```

UI uses **“Long question”** labels and **5 marks** badges (orange accent).

### Sync from generator

```bash
cd long-questions/script
npm run generate:sync
```

Or with mock data:

```bash
node scripts/generateLong.mjs --mock --sync
```

Then refresh the browser.

---

## Typical workflow

1. Add HTML to `script/input/`.
2. `npm run dry-run` to see counts.
3. `npm run generate:sync` for real run + viewer update.
4. Open `vistuallization` (`npm run dev`) and verify.

---

## JSON shape (long)

Payload includes `questionType: "long"`, `marksPerQuestion: 5`, and:

```json
"lessons": [
  {
    "lessonNumber": 1,
    "lessonId": "ls-01",
    "title": "...",
    "longQuestions": [
      {
        "id": "l01-lq01",
        "marks": 5,
        "question": "...",
        "answerBlocks": [ ... ]
      }
    ]
  }
]
```

`answerBlocks` types are the same as short: `paragraph`, `bulletList`, `orderedList`, `table`.

---

## Troubleshooting

- **No HTML in input** — add files under `script/input/` or pass a path.
- **API errors** — same as short: billing, model access, `OPENAI_API_MODE`.
- **Extra cards in the app** — clean `vistuallization/public/courses/index.json` entries you do not want.
