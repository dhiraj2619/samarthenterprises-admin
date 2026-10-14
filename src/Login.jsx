import { useState } from 'react'
import Icon from './Icon.jsx'
import { api, setToken } from './api.js'

export default function Login({ onLogin, theme, onToggleTheme }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      <div className="brand login-brand"><img className="brand-logo" src="/samarthlogo.png" alt="Samarth Enterprises" /></div>
      <h1>Sign in to your workspace</h1>
      <p className="login-sub">Manage your catalogue, categories and Nohar referrals.</p>
      {error && <div className="notice error" role="alert">{error}</div>}
      <label className="field"><span>Email</span><input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required autoFocus /></label>
      <label className="field"><span>Password</span>
        <span className="password-input">
          <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
          {/* mousedown is cancelled so the password field keeps focus while toggling. */}
          <button type="button" className="icon-button password-toggle" onMouseDown={e => e.preventDefault()} onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} title={showPassword ? 'Hide password' : 'Show password'}><Icon name={showPassword ? 'eye-off' : 'eye'} size={18} /></button>
        </span>
      </label>
      <button className="primary login-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}<Icon name="arrow" size={17} /></button>
    </form>
  </div>
}
