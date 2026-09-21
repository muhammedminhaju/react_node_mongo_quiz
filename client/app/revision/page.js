'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { fetchQuestions, fetchTopics } from '@/lib/api';
import { fisherYates } from '@/lib/quizUtils';
import { useToast } from '@/lib/useToast';

export default function RevisionPage() {
  const router = useRouter();
  const { message, showToast } = useToast();
  const [topics, setTopics] = useState(null);
  const [checkedTopics, setCheckedTopics] = useState({});
  const [count, setCount] = useState('10');

  useEffect(() => {
    fetchTopics()
      .then((data) => {
        setTopics(data);
        setCheckedTopics(Object.fromEntries(data.map((topic) => [topic.name, true])));
      })
      .catch(() => setTopics([]));
  }, []);

  function toggleTopic(name) {
    setCheckedTopics((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  async function handleStart() {
    const checked = Object.keys(checkedTopics).filter((name) => checkedTopics[name]);
    if (!checked.length) {
      showToast('Please select at least one topic.');
      return;
    }

    const selections = [];
    for (const topic of checked) {
      const questions = await fetchQuestions(topic);
      selections.push(...questions.map((q) => ({ ...q, topic })));
    }

    if (!selections.length) {
      showToast('No questions available in the selected topics.');
      return;
    }

    const questionsToUse = count === 'all' ? selections : selections.slice(0, Number(count));
    const shuffled = fisherYates(questionsToUse);
    const serialized = { topic: checked.join(','), questions: shuffled, revisionMode: true, selectedTopics: checked };

    localStorage.setItem(
      'quizTempState',
      JSON.stringify({
        topic: 'Revision',
        questions: shuffled,
        currentIndex: 0,
        selectedAnswers: {},
        startedAt: new Date().toISOString(),
        mode: 'revision',
        revisionSelectedTopics: checked
      })
    );
    localStorage.setItem('revisionQuizData', JSON.stringify(serialized));
    router.push('/quiz');
  }

  return (
    <AppShell title="Revision">
      <section className="content-card revision-card">
        <div className="field-group">
          <label>Topics</label>
          <div className="checklist">
            {topics === null ? null : topics.length === 0 ? (
              <div className="empty-state">No topics available.</div>
            ) : (
              topics.map((topic) => (
                <label className="checkbox-row" key={topic.name}>
                  <input
                    type="checkbox"
                    checked={Boolean(checkedTopics[topic.name])}
                    onChange={() => toggleTopic(topic.name)}
                  />
                  <span>{topic.label}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="field-group">
          <label>Number of Questions</label>
          <select value={count} onChange={(event) => setCount(event.target.value)}>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="30">30</option>
            <option value="50">50</option>
            <option value="all">All</option>
          </select>
        </div>

        <button className="btn btn-primary" onClick={handleStart}>
          Start Revision
        </button>
      </section>

      <div className={`toast${message ? ' show' : ''}`}>{message}</div>
    </AppShell>
  );
}
