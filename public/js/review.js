document.addEventListener('DOMContentLoaded', () => {
  const reviewContainer = document.getElementById('reviewContainer');
  const reviewData = JSON.parse(localStorage.getItem('lastReviewData') || 'null');

  if (!reviewContainer || !reviewData || !Array.isArray(reviewData.questions)) {
    reviewContainer.innerHTML = '<div class="empty-state">No review data available.</div>';
    return;
  }

  const { questions, selectedAnswers } = reviewData;
  reviewContainer.innerHTML = questions.map((question, index) => {
    const userAnswer = selectedAnswers[index];
    const isCorrect = userAnswer === question.answer;
    const explanation = question.explanation || 'No explanation provided.';
    const answerHtml = `
      <div class="review-item ${isCorrect ? 'correct' : 'incorrect'}">
        <h3>Question ${index + 1}</h3>
        <p>${question.question}</p>
        <p><strong>Your Answer:</strong> ${userAnswer || 'Unanswered'}</p>
        <p><strong>Correct Answer:</strong> ${question.answer}</p>
        <p><strong>Status:</strong> ${isCorrect ? '✓ Correct' : '✗ Incorrect'}</p>
        <p><strong>Explanation:</strong> ${explanation}</p>
      </div>
    `;
    return answerHtml;
  }).join('');
});
