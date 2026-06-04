import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import ClientModal from '../components/ClientModal'
import styles from './DashboardPage.module.css'

const AVATAR_COLORS = ['#7B6EF6','#34D399','#F87171','#60A5FA','#FBBF24','#F472B6','#A78BFA','#2DD4BF']

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editClient, setEditClient] = useState(null)

  useEffect(() => { fetchClients() }, [])

  async function fetchClients() {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  async function deleteClient(e, id) {
    e.stopPropagation()
    if (!confirm('Kunden wirklich löschen?')) return
    await supabase.from('clients').delete().eq('id', id)
    setClients(c => c.filter(x => x.id !== id))
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  function openEdit(e, client) {
    e.stopPropagation()
    setEditClient(client)
    setShowModal(true)
  }

  function onSaved(client, isNew) {
    if (isNew) setClients(c => [client, ...c])
    else setClients(c => c.map(x => x.id === client.id ? client : x))
    setShowModal(false)
    setEditClient(null)
  }

  const avatarColor = (id) => AVATAR_COLORS[parseInt(id?.replace(/-/g,'').slice(0,8), 16) % AVATAR_COLORS.length] || AVATAR_COLORS[0]

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logoMark}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L15.5 6V12L9 16L2.5 12V6L9 2Z" fill="white" fillOpacity=".9"/>
            </svg>
          </div>
          <span className={styles.logoText}>Optivise</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.userEmail}>{user?.email}</span>
          <button className="btn btn-ghost" onClick={signOut} style={{fontSize:12}}>Logout</button>
        </div>
      </header>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.topRow}>
          <div>
            <h1 className={styles.title}>Kunden</h1>
            <p className={styles.sub}>Wähle einen Kunden und starte den Audit.</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditClient(null); setShowModal(true) }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Neuer Kunde
          </button>
        </div>

        {loading ? (
          <div className={styles.loadingWrap}><div className="spinner spinner-lg" /></div>
        ) : clients.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 4L28 10V22L16 28L4 22V10L16 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
            </div>
            <p className={styles.emptyTitle}>Noch keine Kunden</p>
            <p className={styles.emptySub}>Lege deinen ersten Kunden an um loszulegen.</p>
            <button className="btn btn-primary" style={{marginTop:16}} onClick={() => setShowModal(true)}>Ersten Kunden anlegen</button>
          </div>
        ) : (
          <div className={styles.grid}>
            {clients.map(client => (
              <div key={client.id} className={styles.clientCard} onClick={() => navigate(`/audit/${client.id}`)}>
                <div className={styles.cardTop}>
                  <div className={styles.ava} style={{ background: avatarColor(client.id) + '22', color: avatarColor(client.id) }}>
                    {initials(client.name)}
                  </div>
                  <div className={styles.cardActions}>
                    <button className="btn btn-ghost" style={{padding:'4px 6px',fontSize:12}} onClick={e => openEdit(e, client)}>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9 2.5l1.5 1.5-7 7H2v-1.5l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button className="btn btn-ghost" style={{padding:'4px 6px',fontSize:12,color:'var(--red)'}} onClick={e => deleteClient(e, client.id)}>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3.5h9M5 3.5V2.5h3v1M5.5 6v3.5M7.5 6v3.5M3 3.5l.5 7h6l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
                <div className={styles.clientName}>{client.name}</div>
                <div className={styles.clientInd}>{client.industry || 'Keine Branche'}</div>
                {client.goal && <div className={styles.clientGoal}>{client.goal}</div>}
                <div className={styles.ciRow}>
                  {[client.color_primary, client.color_secondary, client.color_accent].filter(Boolean).map((c, i) => (
                    <div key={i} className={styles.ciDot} style={{ background: c }} title={c} />
                  ))}
                  {client.font && <span className={styles.fontTag}>{client.font}</span>}
                </div>
                <div className={styles.auditBtn}>
                  Audit starten
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
            ))}
            {/* Add card */}
            <div className={`${styles.clientCard} ${styles.addCard}`} onClick={() => { setEditClient(null); setShowModal(true) }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <span>Neuer Kunde</span>
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <ClientModal
          client={editClient}
          onClose={() => { setShowModal(false); setEditClient(null) }}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
