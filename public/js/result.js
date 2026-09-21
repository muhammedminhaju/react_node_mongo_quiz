document.addEventListener('DOMContentLoaded', () => {
  const result = JSON.parse(localStorage.getItem('lastQuizResult') || 'null');
  const scoreSummary = document.getElementById('scoreSummary');
  const percentageSummary = document.getElementById('percentageSummary');
  const correctCount = document.getElementById('correctCount');
  const wrongCount = document.getElementById('wrongCount');
  const unansweredCount = document.getElementById('unansweredCount');

  if (!result) {
    const fallback = { score: '0 / 0', correct: 0, wrong: 0, unanswered: 0, percentage: 0, totalQuestions: 0 };
    if (scoreSummary) scoreSummary.textContent = fallback.score;
    if (percentageSummary) percentageSummary.textContent = '0%';
    if (correctCount) correctCount.textContent = '0';
    if (wrongCount) wrongCount.textContent = '0';
    if (unansweredCount) unansweredCount.textContent = '0';
    return;
  }

  if (scoreSummary) scoreSummary.textContent = `${result.correct} / ${result.totalQuestions}`;
  if (percentageSummary) percentageSummary.textContent = `${result.percentage}%`;
  if (correctCount) correctCount.textContent = String(result.correct);
  if (wrongCount) wrongCount.textContent = String(result.wrong);
  if (unansweredCount) unansweredCount.textContent = String(result.unanswered);

  document.getElementById('reviewBtn')?.addEventListener('click', () => {
    window.location.href = '/review';
  });

  document.getElementById('tryAgainBtn')?.addEventListener('click', () => {
    const topic = localStorage.getItem('selectedTopic') || 'history';
    localStorage.setItem('selectedTopic', topic);
    window.location.href = '/quiz';
  });

  document.getElementById('backToTopicsBtn')?.addEventListener('click', () => {
    window.location.href = '/';
  });
});
