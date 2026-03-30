import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

axios.defaults.baseURL = '/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('pp_token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const saved = localStorage.getItem('pp_user')
      if (saved) setUser(JSON.parse(saved))
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const res = await axios.post('/auth/login', { email, password })
    const { token, user } = res.data
    localStorage.setItem('pp_token', token)
    localStorage.setItem('pp_user', JSON.stringify(user))
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(user)
    return user
  }

  const register = async (name, email, password) => {
    const res = await axios.post('/auth/register', { name, email, password })
    const { token, user } = res.data
    localStorage.setItem('pp_token', token)
    localStorage.setItem('pp_user', JSON.stringify(user))
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(user)
    return user
  }

  const logout = () => {
    localStorage.removeItem('pp_token')
    localStorage.removeItem('pp_user')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
