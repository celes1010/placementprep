import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { RadialBarChart, RadialBar, PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import './Dashboard.css'

const DIFF_COLOR = { easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444' }
const TOPIC_COLOR = ['#6c63ff', '#22c55e', '#f59e0b', '#ec4899']

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/dashboard/overview')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page"><Navbar />
      <div className="dash-loading">
        <div className="quiz-loading-spinner" style={{width:36,height:36,border:'3px solid var(--border)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
      </div>
    </div>
  )

  const totals = data?.totals || {}
  const topics = data?.topics || []
  const sessions = data?.recent_sessions || []

  const pieData = topics
    .filter(t => t.total_attempted > 0)
    .map((t, i) => ({ name: t.topic.split(' ')[0], value: t.total_attempted, fill: TOPIC_COLOR[i] }))

  return (
    <div className="page">
      <Navbar />
      <div className="dashboard animate-fadeUp">
        <div className="dash-header">
          <div>
            <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="dash-sub">Here's your placement prep progress</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/topics')}>
            Start Practicing →
          </button>
        </div>

        {/* Top stat cards */}
        <div className="dash-stats-row">
          {[
            { label: 'Questions Attempted', val: totals.total_questions || 0, color: 'var(--accent)' },
            { label: 'Correct Answers', val: totals.total_correct || 0, color: 'var(--green)' },
            { label: 'Sessions', val: totals.total_sessions || 0, color: 'var(--yellow)' },
            { label: 'Overall Accuracy', val: `${totals.overall_accuracy || 0}%`, color: totals.overall_accuracy >= 60 ? 'var(--green)' : 'var(--red)' },
          ].map((s, i) => (
            <div key={i} className="dash-stat-card animate-fadeUp" style={{ animationDelay: `${i * 0.06}s` }}>
              <span className="dash-stat-val mono" style={{ color: s.color }}>{s.val}</span>
              <span className="dash-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="dash-grid">
          {/* Topic breakdown */}
          <div className="card dash-topics">
            <h2 className="dash-section-title">Topic Progress</h2>
            {topics.length === 0 ? (
              <p className="dash-empty">No attempts yet. <span onClick={() => navigate('/topics')} style={{color:'var(--accent)',cursor:'pointer'}}>Start practicing →</span></p>
            ) : topics.map((t, i) => {
              const acc = t.accuracy
              return (
                <div key={t.topic} className="dash-topic-row">
                  <div className="dash-topic-info">
                    <span className="dash-topic-name">{t.topic}</span>
                    <span className="dash-topic-diff" style={{ color: DIFF_COLOR[t.difficulty] }}>{t.difficulty}</span>
                  </div>
                  <div className="dash-progress-wrap">
                    <div className="dash-progress-bar">
                      <div
                        className="dash-progress-fill"
                        style={{ width: `${acc}%`, background: acc >= 60 ? 'var(--green)' : acc >= 40 ? 'var(--yellow)' : 'var(--red)' }}
                      />
                    </div>
                    <span className="dash-acc mono">{acc}%</span>
                  </div>
                  <div className="dash-topic-meta">
                    <span>{t.total_attempted} attempted</span>
                    <span>🔥 {t.best_streak} best streak</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pie chart */}
          <div className="card dash-pie-card">
            <h2 className="dash-section-title">Distribution</h2>
            {pieData.length === 0 ? (
              <p className="dash-empty">Practice across topics to see distribution</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {pieData.map((d, i) => (
                    <div key={i} className="pie-legend-item">
                      <span className="pie-dot" style={{ background: d.fill }} />
                      <span>{d.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <div className="card dash-sessions">
            <h2 className="dash-section-title">Recent Sessions</h2>
            <div className="sessions-list">
              {sessions.map(s => {
                const acc = s.total_questions > 0
                  ? Math.round(s.correct_answers / s.total_questions * 100) : 0
                return (
                  <div key={s.id} className="session-row">
                    <div className="session-topic">{s.topic}</div>
                    <div className="session-stats mono">
                      {s.correct_answers}/{s.total_questions} correct
                    </div>
                    <div className="session-acc" style={{ color: acc >= 60 ? 'var(--green)' : 'var(--red)' }}>
                      {acc}%
                    </div>
                    <div className="session-diff" style={{ color: DIFF_COLOR[s.difficulty] }}>
                      {s.difficulty}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
