import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => { logout(); navigate('/login') }

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/topics', label: 'Practice' },
  ]

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-logo">
        <span className="navbar-logo-icon">⬡</span>
        <span>Quiz<em>Pal</em></span>
      </Link>

      <div className="navbar-links">
        {navLinks.map(l => (
          <Link
            key={l.to} to={l.to}
            className={`navbar-link ${location.pathname === l.to ? 'active' : ''}`}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="navbar-right">
        <span className="navbar-user">{user?.name?.split(' ')[0]}</span>
        <button className="btn btn-ghost navbar-logout" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </nav>
  )
}
