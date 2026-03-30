import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Auth.css'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post('/admin/login', form)
      localStorage.setItem('admin_token', res.data.token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-grid" />
      </div>

      <div className="auth-box animate-fadeUp">
        <div className="auth-logo">
          <span className="auth-logo-icon">🛡️</span>
          <span className="auth-logo-text">Admin <span>Portal</span></span>
        </div>

        <h1 className="auth-title">Admin Login</h1>
        <p className="auth-sub">QuizPal — Admin Access Only</p>

        <form onSubmit={handle} className="auth-form">
          {error && <div className="auth-error animate-slideDown">{error}</div>}

          <div className="auth-field">
            <label>Username</label>
            <input
              type="text" required placeholder="admin"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input
              type="password" required placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Sign In as Admin'}
          </button>
        </form>

        <p className="auth-switch">
          Not an admin? <a href="/login" style={{color:'var(--accent)'}}>Go to user login →</a>
        </p>
      </div>
    </div>
  )
}