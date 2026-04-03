import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

/**
 * @param {string} htmlPath - absolute or cwd-relative path to handouts HTML
 * @returns {{ lessonId: string, lessonNumber: number, title: string, plainText: string }[]}
 */
export function parseLessonsFromHtml(htmlPath) {
  const resolved = path.resolve(htmlPath);
  const html = fs.readFileSync(resolved, 'utf8');
  const $ = cheerio.load(html);

  const lessons = [];
  $('section.lesson-section').each((_, el) => {
    const $sec = $(el);
    const lessonId = $sec.attr('id') || '';

    const tag = $sec.find('h3.lesson-tag').first();
    const tagText = tag.text().trim();
    const numMatch = tagText.match(/(\d+)/);
    const lessonNumber = numMatch ? parseInt(numMatch[1], 10) : lessons.length + 1;

    const $clone = $sec.clone();
    $clone.find('.lecture-media, .lesson-nav, h3.lesson-tag').remove();

    const titleEl = $clone.find('h2').first();
    const title = titleEl.text().trim() || `Lesson ${lessonNumber}`;

    $clone.find('h2').first().remove();

    const plainText = sectionToPlainText($, $clone);

    lessons.push({
      lessonId,
      lessonNumber,
      title,
      plainText,
    });
  });

  return lessons;
}

function sectionToPlainText($, $root) {
  const parts = [];

  function process($el) {
    $el.contents().each((_, node) => {
      if (node.type === 'text') {
        const t = String(node.data || '').replace(/\s+/g, ' ').trim();
        if (t) parts.push(t);
        return;
      }
      if (node.type !== 'tag') return;

      const name = node.name;
      if (name === 'script' || name === 'style') return;

      const $n = $(node);

      if (name === 'p') {
        const t = $n.text().replace(/\s+/g, ' ').trim();
        if (t) parts.push(t);
        return;
      }
      if (name === 'h2' || name === 'h3') {
        const t = $n.text().replace(/\s+/g, ' ').trim();
        if (t) parts.push(`\n## ${t}\n`);
        return;
      }
      if (name === 'li') {
        const t = $n.text().replace(/\s+/g, ' ').trim();
        if (t) parts.push(`- ${t}`);
        return;
      }
      if (name === 'br') {
        parts.push('');
        return;
      }
      if (name === 'ul' || name === 'ol') {
        process($n);
        return;
      }
      process($n);
    });
  }

  process($root);
  return parts
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
