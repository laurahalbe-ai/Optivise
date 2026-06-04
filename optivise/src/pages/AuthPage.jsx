import { useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './AuthPage.module.css'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // login | signup | reset
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Bitte bestätige deine E-Mail-Adresse, dann kannst du dich einloggen.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        })
        if (error) throw error
        setSuccess('Wir haben dir einen Reset-Link geschickt.')
      }
    } catch (err) {
      setError(err.message || 'Etwas ist schiefgelaufen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.bg} />
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L15.5 6V12L9 16L2.5 12V6L9 2Z" fill="white" fillOpacity=".9"/>
            </svg>
          </div>
          <span className={styles.logoText}>Optivise</span>
        </div>

        <h1 className={styles.title}>
          {mode === 'login' ? 'Willkommen zurück' : mode === 'signup' ? 'Account erstellen' : 'Passwort zurücksetzen'}
        </h1>
        <p className={styles.sub}>
          {mode === 'login' ? 'Meld dich an um fortzufahren.' : mode === 'signup' ? 'Leg deinen kostenlosen Account an.' : 'Wir schicken dir einen Reset-Link.'}
        </p>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className="label">E-Mail</label>
            <input type="email" placeholder="deine@email.de" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          {mode !== 'reset' && (
            <div className={styles.field}>
              <label className="label">Passwort</label>
              <input type="password" placeholder={mode === 'signup' ? 'Mind. 6 Zeichen' : '••••••••'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} />
            </div>
          )}
          <button type="submit" className={`btn btn-primary btn-full btn-lg ${styles.submitBtn}`} disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            {mode === 'login' ? 'Einloggen' : mode === 'signup' ? 'Account erstellen' : 'Reset-Link senden'}
          </button>
        </form>

        <div className={styles.footer}>
          {mode === 'login' && <>
            <button className={styles.link} onClick={()=>{setMode('reset');setError('');setSuccess('')}}>Passwort vergessen?</button>
            <span className={styles.sep}>·</span>
            <button className={styles.link} onClick={()=>{setMode('signup');setError('');setSuccess('')}}>Account erstellen</button>
          </>}
          {mode === 'signup' && <>
            <button className={styles.link} onClick={()=>{setMode('login');setError('');setSuccess('')}}>Zurück zum Login</button>
          </>}
          {mode === 'reset' && <>
            <button className={styles.link} onClick={()=>{setMode('login');setError('');setSuccess('')}}>Zurück zum Login</button>
          </>}
        </div>
      </div>
    </div>
  )
}
