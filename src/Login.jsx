import { useState } from 'react'
import Icon from './Icon.jsx'
import { api, setToken } from './api.js'

export default function Login({ onLogin, theme, onToggleTheme }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async event => {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const { data } = await api.login(email, password)
      setToken(data.token)
      onLogin(data.admin)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return <div className="login-shell">
    <button className="theme-toggle login-theme" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} /></button>
    <form className="login-card" onSubmit={submit}>
      <div className="brand login-brand"><span className="brand-mark">S<span>•</span></span><span>SAMARTH<small>ENTERPRISES</small></span></div>
      <h1>Sign in to your workspace</h1>
      <p className="login-sub">Manage your catalogue, categories and Nohar referrals.</p>
      {error && <div className="notice error" role="alert">{error}</div>}
      <label className="field"><span>Email</span><input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required autoFocus /></label>
      <label className="field"><span>Password</span><input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
      <button className="primary login-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}<Icon name="arrow" size={17} /></button>
    </form>
  </div>
}
