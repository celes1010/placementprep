import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const DIFF_COLOR = { easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444' }
const TOPIC_COLOR = ['#6c63ff', '#22c55e', '#f59e0b', '#ec4899']

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { navigate('/admin'); return }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        axios.get('/admin/stats'),
        axios.get('/admin/users')
    ])
      setStats(statsRes.data)
      setUsers(usersRes.data.users)
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('admin_token')
        navigate('/admin')
      } else {
        setError('Failed to load data')
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    delete axios.defaults.headers.common['Authorization']
    navigate('/admin')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--red)' }}>{error}</div>
  )

  const pieData = stats.topic_breakdown.map((t, i) => ({
    name: t.topic.split(' ')[0],
    value: t.attempts,
    fill: TOPIC_COLOR[i]
  }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Navbar */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 60,
        background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>
          🛡️ Admin <span style={{ color: 'var(--accent)' }}>Portal</span>
        </div>
        <button className="btn btn-ghost" onClick={logout} style={{ fontSize: '0.8rem' }}>
          Sign Out
        </button>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 60px' }}>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 6, letterSpacing: '-0.5px' }}>
          Admin Dashboard
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: '0.9rem' }}>
          Overview of all users and platform activity
        </p>

        {/* Top stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Users', val: stats.total_users, color: 'var(--accent)' },
            { label: 'Total Sessions', val: stats.total_sessions, color: 'var(--yellow)' },
            { label: 'Questions Attempted', val: stats.total_questions, color: 'var(--green)' },
            { label: 'Overall Accuracy', val: `${stats.overall_accuracy}%`, color: stats.overall_accuracy >= 60 ? 'var(--green)' : 'var(--red)' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: s.color }}>{s.val}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Topic breakdown + pie */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, marginBottom: 32 }}>
          <div className="card">
            <p style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 20 }}>
              Topic Breakdown
            </p>
            {stats.topic_breakdown.map((t, i) => {
              const acc = Math.round(t.correct / Math.max(t.attempts, 1) * 100)
              return (
                <div key={t.topic} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{t.topic}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: acc >= 60 ? 'var(--green)' : 'var(--red)' }}>{acc}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${acc}%`, background: TOPIC_COLOR[i], borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>{t.attempts} attempts</span>
                </div>
              )
            })}
          </div>

          <div className="card">
            <p style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 16 }}>
              Attempts by Topic
            </p>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {pieData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill, flexShrink: 0 }} />
                      {d.name}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>No attempts yet</p>
            )}
          </div>
        </div>

        {/* Users table */}
        <div className="card">
          <p style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 20 }}>
            All Users ({users.length})
          </p>

          {users.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>No users registered yet</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Name', 'Email', 'Joined', 'Questions', 'Accuracy', 'Details'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <>
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px', fontWeight: 600 }}>{u.name}</td>
                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{u.email}</td>
                        <td style={{ padding: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                          {new Date(u.joined).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'var(--font-mono)' }}>{u.total_questions}</td>
                        <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: u.overall_accuracy >= 60 ? 'var(--green)' : 'var(--red)' }}>
                          {u.overall_accuracy}%
                        </td>
                        <td style={{ padding: '12px' }}>
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                            onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                          >
                            {selectedUser?.id === u.id ? 'Hide ▲' : 'View ▼'}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded topic breakdown for this user */}
                      {selectedUser?.id === u.id && (
                        <tr key={`${u.id}-detail`}>
                          <td colSpan={6} style={{ padding: '0 12px 16px', background: 'var(--bg-elevated)' }}>
                            <div style={{ paddingTop: 12 }}>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Topic Breakdown for {u.name}
                              </p>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                                {u.topics.length === 0 ? (
                                  <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', gridColumn: '1/-1' }}>No attempts yet</p>
                                ) : u.topics.map((t, i) => {
                                  const acc = Math.round(t.total_correct / Math.max(t.total_attempted, 1) * 100)
                                  return (
                                    <div key={t.topic} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                                      <p style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>{t.topic}</p>
                                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: acc >= 60 ? 'var(--green)' : 'var(--red)', marginBottom: 2 }}>{acc}%</p>
                                      <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{t.total_attempted} attempted</p>
                                      <p style={{ fontSize: '0.68rem', color: DIFF_COLOR[t.current_difficulty], fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', marginTop: 4 }}>
                                        {t.current_difficulty}
                                      </p>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}