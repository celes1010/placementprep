import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Results.css'

export default function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const { summary, topic, session_id } = location.state || {}

  const [feedback, setFeedback] = useState(null)
  const [loadingFeedback, setLoadingFeedback] = useState(true)
  const [feedbackError, setFeedbackError] = useState(false)

  useEffect(() => {
    if (!summary) { navigate('/topics'); return }
    fetchFeedback()
  }, [])

  const fetchFeedback = async () => {
    try {
      const res = await axios.post('/quiz/feedback', {
        session_id,
        topic
      })
      setFeedback(res.data.feedback)
    } catch (e) {
      setFeedbackError(true)
    } finally {
      setLoadingFeedback(false)
    }
  }

  if (!summary) return null

  const { total_questions, correct_answers, accuracy } = summary
  const grade =
    accuracy >= 80 ? { label: 'Excellent', color: 'var(--green)', emoji: '🏆' } :
    accuracy >= 60 ? { label: 'Good', color: 'var(--accent)', emoji: '👍' } :
    accuracy >= 40 ? { label: 'Fair', color: 'var(--yellow)', emoji: '📈' } :
                     { label: 'Keep Practicing', color: 'var(--red)', emoji: '💪' }

  return (
    <div className="results-page animate-fadeUp">

      {/* Score Card */}
      <div className="results-card">
        <div className="results-emoji">{grade.emoji}</div>
        <h1 className="results-grade" style={{ color: grade.color }}>{grade.label}</h1>
        <p className="results-topic">{topic}</p>

        <div className="results-stats">
          <div className="r-stat">
            <span className="r-stat-val mono">{total_questions}</span>
            <span className="r-stat-label">Questions</span>
          </div>
          <div className="r-stat">
            <span className="r-stat-val mono" style={{ color: 'var(--green)' }}>{correct_answers}</span>
            <span className="r-stat-label">Correct</span>
          </div>
          <div className="r-stat">
            <span className="r-stat-val mono" style={{ color: grade.color }}>{accuracy}%</span>
            <span className="r-stat-label">Accuracy</span>
          </div>
        </div>

        {/* AI Feedback Section */}
        <div className="feedback-section">
          <div className="feedback-header">
            <span className="feedback-icon">🤖</span>
            <span className="feedback-title">AI Coach Feedback</span>
          </div>

          {loadingFeedback ? (
            <div className="feedback-loading">
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              <span>Analyzing your performance...</span>
            </div>
          ) : feedbackError ? (
            <p className="feedback-error">Could not load feedback. Try again later.</p>
          ) : feedback ? (
            <div className="feedback-body animate-fadeUp">

              <p className="feedback-overall">{feedback.overall}</p>

              <div className="feedback-grid">
                <div className="feedback-item feedback-good">
                  <span className="feedback-item-label">💪 Strengths</span>
                  <p>{feedback.strengths}</p>
                </div>
                <div className="feedback-item feedback-bad">
                  <span className="feedback-item-label">⚠️ Weak Areas</span>
                  <p>{feedback.weak_areas}</p>
                </div>
              </div>

              {feedback.focus_topics?.length > 0 && (
                <div className="feedback-focus">
                  <span className="feedback-item-label">📚 Focus On</span>
                  <div className="feedback-tags">
                    {feedback.focus_topics.map((t, i) => (
                      <span key={i} className="feedback-tag">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="feedback-tip">
                <span className="feedback-item-label">💡 Study Tip</span>
                <p>{feedback.tip}</p>
              </div>

              <div className="feedback-goal">
                <span className="feedback-item-label">🎯 Next Session Goal</span>
                <p>{feedback.next_goal}</p>
              </div>

            </div>
          ) : null}
        </div>

        <div className="results-actions">
          <button className="btn btn-primary" onClick={() => navigate('/topics')}>
            Practice Again →
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
            View Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}