import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Navbar from '../components/Navbar'
import './TopicSelect.css'

const TOPICS = [
  {
    id: 'DSA & Algorithms',
    label: 'DSA & Algorithms',
    icon: '🌲',
    desc: 'Arrays, Trees, Graphs, DP, Sorting, Complexity',
    color: '#6c63ff',
  },
  {
    id: 'CS Fundamentals',
    label: 'CS Fundamentals',
    icon: '⚙️',
    desc: 'OS, DBMS, Computer Networks, SQL',
    color: '#22c55e',
  },
  {
    id: 'Aptitude & Reasoning',
    label: 'Aptitude & Reasoning',
    icon: '🧮',
    desc: 'Quantitative, Logical Reasoning, Puzzles',
    color: '#f59e0b',
  },
  {
    id: 'Core CS (OOP)',
    label: 'Core CS (OOP)',
    icon: '📦',
    desc: 'OOP Concepts, Design Patterns, SOLID Principles',
    color: '#ec4899',
  },
]

export default function TopicSelect() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({})
  const [starting, setStarting] = useState(null)

  useEffect(() => {
    axios.get('/dashboard/overview').then(res => {
      const map = {}
      res.data.topics.forEach(t => { map[t.topic] = t })
      setStats(map)
    }).catch(() => {})
  }, [])

  const startQuiz = async (topicId) => {
    setStarting(topicId)
    try {
      const res = await axios.post('/quiz/start', { topic: topicId })
      navigate('/quiz', { state: { session: res.data } })
    } catch (e) {
      alert('Failed to start quiz. Please try again.')
    } finally {
      setStarting(null)
    }
  }

  const diffColor = { easy: 'var(--easy)', medium: 'var(--medium)', hard: 'var(--hard)' }

  return (
    <div className="page">
      <Navbar />
      <div className="topic-page animate-fadeUp">
        <div className="topic-header">
          <h1>Choose a Topic</h1>
          <p>Questions adapt to your level in real-time — get harder as you improve, easier if you struggle.</p>
        </div>

        <div className="topic-grid">
          {TOPICS.map((t, i) => {
            const s = stats[t.id]
            const diff = s?.difficulty || 'easy'
            const acc = s?.accuracy ?? null
            const attempted = s?.total_attempted ?? 0

            return (
              <div
                key={t.id}
                className="topic-card animate-fadeUp"
                style={{ animationDelay: `${i * 0.07}s`, '--t-color': t.color }}
              >
                <div className="topic-card-top">
                  <div className="topic-icon">{t.icon}</div>
                  <div className="topic-diff-badge" style={{ color: diffColor[diff], borderColor: diffColor[diff] }}>
                    {diff.toUpperCase()}
                  </div>
                </div>

                <h2 className="topic-name">{t.label}</h2>
                <p className="topic-desc">{t.desc}</p>

                <div className="topic-stats-row">
                  {attempted > 0 ? (
                    <>
                      <div className="topic-stat">
                        <span className="topic-stat-val">{attempted}</span>
                        <span className="topic-stat-label">Attempted</span>
                      </div>
                      <div className="topic-stat">
                        <span className="topic-stat-val" style={{ color: acc >= 60 ? 'var(--green)' : 'var(--red)' }}>
                          {acc}%
                        </span>
                        <span className="topic-stat-label">Accuracy</span>
                      </div>
                      <div className="topic-stat">
                        <span className="topic-stat-val">{s?.best_streak ?? 0}</span>
                        <span className="topic-stat-label">Best Streak</span>
                      </div>
                    </>
                  ) : (
                    <p className="topic-not-started">Not started yet</p>
                  )}
                </div>

                <button
                  className="btn btn-primary topic-start-btn"
                  onClick={() => startQuiz(t.id)}
                  disabled={starting === t.id}
                >
                  {starting === t.id
                    ? <><span className="spinner" /> Starting…</>
                    : attempted > 0 ? 'Continue →' : 'Start →'
                  }
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
