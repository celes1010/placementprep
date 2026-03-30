import { useLocation, useNavigate } from 'react-router-dom'
import './Results.css'

export default function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const { summary, topic } = location.state || {}

  if (!summary) { navigate('/topics'); return null }

  const { total_questions, correct_answers, accuracy } = summary
  const grade =
    accuracy >= 80 ? { label: 'Excellent', color: 'var(--green)', emoji: '🏆' } :
    accuracy >= 60 ? { label: 'Good', color: 'var(--accent)', emoji: '👍' } :
    accuracy >= 40 ? { label: 'Fair', color: 'var(--yellow)', emoji: '📈' } :
                     { label: 'Keep Practicing', color: 'var(--red)', emoji: '💪' }

  return (
    <div className="results-page animate-fadeUp">
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
