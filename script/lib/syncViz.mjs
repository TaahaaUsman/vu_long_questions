import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Workspace root `aa/` (three levels up from this file) */
export function workspaceRoot() {
  return path.join(__dirname, '..', '..', '..');
}

/**
 * @param {'short' | 'long'} kind
 */
export function syncToViz(repoRoot, outputPath, kind) {
  const segment =
    kind === 'short'
      ? ['short-questions', 'vistuallization', 'public', 'courses']
      : ['long-questions', 'vistuallization', 'public', 'courses'];
  const vizCoursesDir = path.join(repoRoot, ...segment);
  const fileName = path.basename(outputPath);

  fs.mkdirSync(vizCoursesDir, { recursive: true });
  const dest = path.join(vizCoursesDir, fileName);
  fs.copyFileSync(outputPath, dest);
  console.log('Synced →', dest);

  const indexPath = path.join(vizCoursesDir, 'index.json');
  let index = { courses: [] };
  if (fs.existsSync(indexPath)) {
    try {
      index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch {
      index = { courses: [] };
    }
  }
  if (!Array.isArray(index.courses)) index.courses = [];

  const dataUrl = `/courses/${fileName}`;
  const exists = index.courses.some((c) => c.dataUrl === dataUrl);
  if (exists) {
    console.log('index.json already lists', dataUrl);
    return;
  }

  const baseId = path.basename(fileName, '.json').replace(/[^a-zA-Z0-9-_]/g, '-');
  const code = process.env.COURSE_CODE || 'ACC311';
  const title = process.env.COURSE_TITLE || 'Fundamentals of Auditing';
  const friendly = baseId.replace(/-(short|long)-questions$/i, '').replace(/-/g, ' ');

  index.courses.push({
    id: baseId,
    code,
    title,
    subtitle:
      kind === 'short'
        ? `Short questions — ${friendly}`
        : `Long questions (5 marks) — ${friendly}`,
    dataUrl,
  });

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
  console.log('Appended entry to index.json');
}

export function listHtmlFiles(inputDir) {
  if (!fs.existsSync(inputDir)) return [];
  return fs
    .readdirSync(inputDir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.toLowerCase().endsWith('.html'))
    .map((d) => path.join(inputDir, d.name))
    .sort();
}
