import { useEffect, useState } from 'react';
import { AnswerBlocks } from './AnswerBlocks';

export function CourseStudy({ courseMeta, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [activeLecture, setActiveLecture] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetch(courseMeta.dataUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load (${r.status})`);
        return r.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setActiveLecture(0);
        }
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || 'Load failed');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseMeta.dataUrl]);

  const lectures = data?.lessons || [];
  const lecture = lectures[activeLecture];
  const prevLecture = activeLecture > 0 ? lectures[activeLecture - 1] : null;
  const nextLecture =
    activeLecture < lectures.length - 1 ? lectures[activeLecture + 1] : null;

  const longQuestions = lecture?.longQuestions ?? [];

  useEffect(() => {
    if (lecture) {
      const main = document.querySelector('.lms-main');
      if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
      else window.scrollTo(0, 0);
    }
  }, [activeLecture, lecture]);

  return (
    <div className="lms-shell">
      <aside className="lms-sidebar" aria-label="Lectures">
        <div className="sb-header">
          <button type="button" className="back-link" onClick={onBack}>
            ← Courses
          </button>
          <h1 className="sb-title">{courseMeta.code}</h1>
          <p className="sb-sub muted">{courseMeta.title}</p>
        </div>
        <nav className="sb-nav" aria-label="Lecture list">
          {loading && <p className="muted pad">Loading…</p>}
          {err && <p className="error-text pad">{err}</p>}
          {!loading &&
            !err &&
            lectures.map((L, i) => (
              <button
                key={L.lessonId || i}
                type="button"
                className={`nav-item${i === activeLecture ? ' active' : ''}`}
                onClick={() => setActiveLecture(i)}
              >
                <span className="nav-item__num">
                  Lecture {String(L.lessonNumber).padStart(2, '0')}
                </span>
                <span className="nav-item__title">{L.title}</span>
              </button>
            ))}
        </nav>
      </aside>

      <main className="lms-main">
        {lecture && (
          <div className="content-container">
            <header className="lecture-header">
              <span className="lecture-badge">Lecture {lecture.lessonNumber}</span>
              <h2 className="title">{lecture.title}</h2>
            </header>

            {longQuestions.length === 0 && (
              <p className="muted card empty-long">
                No long questions in this file yet. Run{' '}
                <code className="inline-code">long-questions/script</code> generate and copy JSON to{' '}
                <code className="inline-code">public/courses/</code>.
              </p>
            )}

            {longQuestions.map((q) => (
              <article key={q.id} className="card question-card question-card--long">
                <div className="question-card__head">
                  <h3 className="question-label">Long question</h3>
                  <span className="marks-badge">{q.marks ?? 5} marks</span>
                </div>
                <p className="question-text">{q.question}</p>
                <h4 className="answer-label">Answer</h4>
                <AnswerBlocks blocks={q.answerBlocks} />
              </article>
            ))}

            <nav className="lecture-nav-footer" aria-label="Lecture navigation">
              <button
                type="button"
                className="lecture-nav-btn lecture-nav-btn--prev"
                disabled={!prevLecture}
                onClick={() => setActiveLecture((i) => Math.max(0, i - 1))}
              >
                <span className="lecture-nav-dir">
                  ←{' '}
                  {prevLecture ? (
                    <span className="lecture-nav-num">
                      Lecture {String(prevLecture.lessonNumber).padStart(2, '0')}
                    </span>
                  ) : (
                    <span className="lecture-nav-num">—</span>
                  )}
                </span>
                <span className="lecture-nav-title">
                  {prevLecture ? prevLecture.title : 'Previous lecture'}
                </span>
              </button>
              <button
                type="button"
                className="lecture-nav-btn lecture-nav-btn--next"
                disabled={!nextLecture}
                onClick={() =>
                  setActiveLecture((i) => Math.min(lectures.length - 1, i + 1))
                }
              >
                <span className="lecture-nav-dir">
                  {nextLecture ? (
                    <>
                      <span className="lecture-nav-num">
                        Lecture {String(nextLecture.lessonNumber).padStart(2, '0')}
                      </span>{' '}
                      →
                    </>
                  ) : (
                    <span className="lecture-nav-num">—</span>
                  )}
                </span>
                <span className="lecture-nav-title">
                  {nextLecture ? nextLecture.title : 'Next lecture'}
                </span>
              </button>
            </nav>
          </div>
        )}
      </main>
    </div>
  );
}
