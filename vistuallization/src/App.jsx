import { useEffect, useState } from 'react';
import { CourseHome } from './components/CourseHome';
import { CourseStudy } from './components/CourseStudy';

export default function App() {
  const [index, setIndex] = useState(null);
  const [idxLoading, setIdxLoading] = useState(true);
  const [idxError, setIdxError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch('/courses/index.json')
      .then((r) => {
        if (!r.ok) throw new Error('Could not load /courses/index.json');
        return r.json();
      })
      .then(setIndex)
      .catch((e) => setIdxError(e.message))
      .finally(() => setIdxLoading(false));
  }, []);

  const courses = index?.courses || [];

  return (
    <div className="app-root">
      {selected ? (
        <CourseStudy courseMeta={selected} onBack={() => setSelected(null)} />
      ) : (
        <CourseHome
          courses={courses}
          loading={idxLoading}
          error={idxError}
          onSelect={setSelected}
        />
      )}
    </div>
  );
}
