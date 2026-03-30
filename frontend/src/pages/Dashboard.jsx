import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell
} from 'recharts'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import './Dashboard.css'

const DIFF_COLOR = { easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444' }
const TOPIC_COLOR = ['#6c63ff', '#22c55e', '#f59e0b', '#ec4899']
const TOPICS = ['DSA & Algorithms', 'CS Fundamentals', 'Aptitude & Reasoning', 'Core CS (OOP)']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '10px 14px', fontSize: 12
      }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
        <p style={{ color: 'var(--accent)', fontWeight: 700 }}>{payload[0].value}% accuracy</p>
      </div>
    )
  }
  return null
}

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
        <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    </div>
  )

  const totals = data?.totals || {}
  const topics = data?.topics || []
  const sessions = data?.recent_sessions || []

  // Build accuracy over time from sessions (most recent last)
  const accuracyData = [...sessions]
    .reverse()
    .map((s, i) => ({
      name: `S${i + 1}`,
      accuracy: s.total_questions > 0
        ? Math.round(s.correct_answers / s.total_questions * 100)
        : 0,
      topic: s.topic,
      date: new Date(s.started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    }))

  const pieData = topics
    .filter(t => t.total_attempted > 0)
    .map((t, i) => ({
      name: t.topic.split(' ')[0],
      value: t.total_attempted,
      fill: TOPIC_COLOR[i]
    }))

  return (
    <div className="page">
      <Navbar />
      <div className="dashboard animate-fadeUp">

        {/* Header */}
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
            {
              label: 'Overall Accuracy',
              val: `${totals.overall_accuracy || 0}%`,
              color: (totals.overall_accuracy || 0) >= 60 ? 'var(--green)' : 'var(--red)'
            },
          ].map((s, i) => (
            <div key={i} className="dash-stat-card animate-fadeUp" style={{ animationDelay: `${i * 0.06}s` }}>
              <span className="dash-stat-val mono" style={{ color: s.color }}>{s.val}</span>
              <span className="dash-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Accuracy Over Time */}
        {accuracyData.length > 1 && (
          <div className="card dash-accuracy-chart">
            <h2 className="dash-section-title">Accuracy Over Time</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={accuracyData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--text-dim)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: 'var(--text-dim)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={{ fill: 'var(--accent)', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: 'var(--accent)' }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: 4 }}>
              Each point represents one session (oldest → newest)
            </p>
          </div>
        )}

        {/* Topic Progress + Pie */}
        <div className="dash-grid">
          <div className="card dash-topics">
            <h2 className="dash-section-title">Topic Progress</h2>
            {topics.length === 0 ? (
              <p className="dash-empty">
                No attempts yet.{' '}
                <span onClick={() => navigate('/topics')} style={{ color: 'var(--accent)', cursor: 'pointer' }}>
                  Start practicing →
                </span>
              </p>
            ) : TOPICS.map((topicName, i) => {
              const t = topics.find(x => x.topic === topicName)
              const acc = t?.accuracy ?? 0
              const attempted = t?.total_attempted ?? 0
              const diff = t?.current_difficulty ?? 'easy'
              const streak = t?.best_streak ?? 0

              return (
                <div key={topicName} className="dash-topic-row">
                  <div className="dash-topic-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: TOPIC_COLOR[i], flexShrink: 0 }} />
                      <span className="dash-topic-name">{topicName}</span>
                    </div>
                    <span className="dash-topic-diff" style={{ color: DIFF_COLOR[diff] }}>
                      {diff.toUpperCase()}
                    </span>
                  </div>

                  <div className="dash-progress-wrap">
                    <div className="dash-progress-bar">
                      <div
                        className="dash-progress-fill"
                        style={{
                          width: `${acc}%`,
                          background: acc >= 60 ? TOPIC_COLOR[i] : acc >= 40 ? 'var(--yellow)' : 'var(--red)'
                        }}
                      />
                    </div>
                    <span className="dash-acc mono">{acc}%</span>
                  </div>

                  <div className="dash-topic-meta">
                    {attempted > 0 ? (
                      <>
                        <span>{attempted} attempted</span>
                        <span>🔥 {streak} best streak</span>
                        <span style={{ color: acc >= 60 ? 'var(--green)' : 'var(--red)' }}>
                          {acc >= 60 ? '✓ On track' : '↑ Needs work'}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Not started</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pie */}
          <div className="card dash-pie-card">
            <h2 className="dash-section-title">Attempts Distribution</h2>
            {pieData.length === 0 ? (
              <p className="dash-empty">Practice across topics to see distribution</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData} cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3} dataKey="value"
                    >
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 8, color: 'var(--text)', fontSize: 12
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {pieData.map((d, i) => (
                    <div key={i} className="pie-legend-item">
                      <span className="pie-dot" style={{ background: d.fill }} />
                      <span>{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <div className="card dash-sessions">
            <h2 className="dash-section-title">Recent Sessions</h2>
            <div className="sessions-list">
              {sessions.map((s, i) => {
                const acc = s.total_questions > 0
                  ? Math.round(s.correct_answers / s.total_questions * 100) : 0
                const date = new Date(s.started_at).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })
                const topicIdx = TOPICS.indexOf(s.topic)
                const topicColor = TOPIC_COLOR[topicIdx] || 'var(--accent)'

                return (
                  <div key={s.id} className="session-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: topicColor, flexShrink: 0 }} />
                      <div>
                        <div className="session-topic">{s.topic}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>{date}</div>
                      </div>
                    </div>
                    <div className="session-stats mono">{s.correct_answers}/{s.total_questions}</div>
                    <div className="session-acc" style={{ color: acc >= 60 ? 'var(--green)' : 'var(--red)' }}>
                      {acc}%
                    </div>
                    <div className="session-diff" style={{ color: DIFF_COLOR[s.difficulty] }}>
                      {s.difficulty}
                    </div>
                    <div style={{
                      fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20,
                      background: acc >= 60 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      color: acc >= 60 ? 'var(--green)' : 'var(--red)',
                      fontWeight: 600
                    }}>
                      {acc >= 80 ? 'Excellent' : acc >= 60 ? 'Good' : acc >= 40 ? 'Fair' : 'Poor'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {sessions.length === 0 && topics.every(t => t.total_attempted === 0) && (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ fontSize: '2rem', marginBottom: 12 }}>🚀</p>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>No sessions yet!</p>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>
              Start practicing to see your progress here
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/topics')}>
              Start First Session →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}