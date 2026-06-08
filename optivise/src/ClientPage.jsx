import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ClientModal from '../components/ClientModal'
import styles from './ClientPage.module.css'

const CATEGORIES = ['CI / Design', 'Copy / Texte', 'CRO / Conversion', 'Technik', 'Strategie', 'Sonstiges']
const AVATAR_COLORS = ['#7B6EF6','#34D399','#F87171','#60A5FA','#FBBF24','#F472B6']

function avaColor(id) { return AVATAR_COLORS[parseInt(id?.replace(/-/g,'').slice(0,8),16) % AVATAR_COLORS.length] }
function ini(name) { return name?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?' }

export default function ClientPage() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('history')
  const [showEdit, setShowEdit] = useState(false)
  const [newInternal, setNewInternal] = useState({ category: 'CI / Design', text: '', date: new Date().toISOString().slice(0,10) })
  const [newClient, setNewClient] = useState({ category: 'CI / Design', text: '', date: new Date().toISOString().slice(0,10) })

  useEffect(() => {
    Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('audits').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
    ]).then(([{ data: c }, { data: a }]) => {
      setClient(c)
      setAudits(a || [])
      setLoading(false)
    })
  }, [clientId])

  async function addFeedback(type) {
    const entry = type === 'internal' ? newInternal : newClient
    if (!entry.text.trim()) return
    const key = type === 'internal' ? 'feedback_internal' : 'feedback_client'
    const existing = client[key] || []
    const updated = [{ ...entry, id: Date.now() }, ...existing]
    await supabase.from('clients').update({ [key]: updated }).eq('id', clientId)
    setClient(c => ({ ...c, [key]: updated }))
    if (type === 'internal') setNewInternal({ category: 'CI / Design', text: '', date: new Date().toISOString().slice(0,10) })
    else setNewClient({ category: 'CI / Design', text: '', date: new Date().toISOString().slice(0,10) })
  }

  async function removeFeedback(type, id) {
    const key = type === 'internal' ? 'feedback_internal' : 'feedback_client'
    const updated = (client[key] || []).filter(f => f.id !== id)
    await supabase.from('clients').update({ [key]: updated }).eq('id', clientId)
    setClient(c => ({ ...c, [key]: updated }))
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}><div className="spinner spinner-lg"/></div>
  if (!client) return <div style={{padding:40,textAlign:'center',color:'var(--text-2)'}}>Kunde nicht gefunden.</div>

  const color = avaColor(client.id)

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <button className="btn btn-ghost" style={{padding:'6px 10px',fontSize:13,gap:6}} onClick={() => navigate('/')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Alle Kunden
        </button>
        <div className={styles.clientHead}>
          <div className={styles.ava} style={{background:color+'22',color}}>{ini(client.name)}</div>
          <div>
            <div className={styles.clientName}>{client.name}</div>
            <div className={styles.clientInd}>{client.industry || 'Keine Branche'}</div>
          </div>
        </div>
        <button className="btn btn-secondary" style={{fontSize:12}} onClick={() => setShowEdit(true)}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M9 2.5l1.5 1.5-7 7H2v-1.5l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Bearbeiten
        </button>
      </header>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab==='history'?styles.tabOn:''}`} onClick={() => setTab('history')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1a6 6 0 100 12A6 6 0 007 1zM7 4v3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          Historie ({audits.length})
        </button>
        <button className={`${styles.tab} ${tab==='feedback'?styles.tabOn:''}`} onClick={() => setTab('feedback')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2h10v8H8l-3 2v-2H2V2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Feedback
        </button>
        <button className={`${styles.tab} ${tab==='brand'?styles.tabOn:''}`} onClick={() => setTab('brand')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 7h6M7 4v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          Brand Kit
        </button>
        <div className={styles.tabSpacer} />
        <button className="btn btn-primary" style={{fontSize:12,padding:'7px 14px'}} onClick={() => navigate(`/audit/${clientId}`)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          Neuer Audit
        </button>
      </div>

      <div className={styles.content}>

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div className="fade-in">
            {audits.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>📋</div>
                <div className={styles.emptyTitle}>Noch keine Audits</div>
                <div className={styles.emptySub}>Starte den ersten Audit für {client.name}.</div>
                <button className="btn btn-primary" style={{marginTop:16}} onClick={() => navigate(`/audit/${clientId}`)}>Audit starten</button>
              </div>
            ) : (
              <div className={styles.auditList}>
                {audits.map(a => (
                  <div key={a.id} className={styles.auditCard} onClick={() => navigate(`/audit/${clientId}?auditId=${a.id}`)}>
                    <div className={`${styles.auditVerdict} ${a.approved ? styles.verdictOk : styles.verdictNo}`}>
                      {a.approved ? '✓' : '✗'}
                    </div>
                    <div className={styles.auditInfo}>
                      <div className={styles.auditTitle}>{a.verdict_headline || 'Audit'}</div>
                      <div className={styles.auditMeta}>
                        <span>{new Date(a.created_at).toLocaleDateString('de-DE')}</span>
                        <span>·</span>
                        <span>{a.type === 'lp' ? 'Landing Page' : a.type === 'video' ? 'Video' : 'Creative'}</span>
                        {a.file_names?.length > 0 && <><span>·</span><span>{a.file_names.length} Datei{a.file_names.length > 1 ? 'en' : ''}</span></>}
                      </div>
                    </div>
                    <div className={styles.auditScore} style={{color: a.score >= 75 ? 'var(--green)' : a.score >= 50 ? 'var(--amber)' : 'var(--red)'}}>
                      {a.score}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{color:'var(--text-3)'}}><path d="M4 7h6M7 4l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FEEDBACK TAB */}
        {tab === 'feedback' && (
          <div className="fade-in">
            {/* Internal */}
            <div className={styles.fbSection}>
              <div className={styles.fbSectionHead}>
                <div className={styles.fbIcon} style={{background:'#7B6EF620',color:'#7B6EF6'}}>👤</div>
                <div>
                  <div className={styles.fbTitle}>Team-Feedback</div>
                  <div className={styles.fbSub}>Notizen vom Teamleiter oder QA – fließen in zukünftige Audits ein</div>
                </div>
              </div>
              <div className={styles.fbInput}>
                <div className={styles.fbInputRow}>
                  <select value={newInternal.category} onChange={e => setNewInternal(p=>({...p,category:e.target.value}))}>
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                  <input type="date" value={newInternal.date} onChange={e => setNewInternal(p=>({...p,date:e.target.value}))} style={{width:140}} />
                </div>
                <textarea value={newInternal.text} onChange={e => setNewInternal(p=>({...p,text:e.target.value}))} placeholder="z.B. Kunde bevorzugt Bilder mit echten Personen. Keine Stock-Fotos." rows={2} />
                <button className="btn btn-primary" style={{alignSelf:'flex-end',fontSize:12}} onClick={() => addFeedback('internal')} disabled={!newInternal.text.trim()}>Speichern</button>
              </div>
              {(client.feedback_internal||[]).length > 0 && (
                <div className={styles.fbList}>
                  {(client.feedback_internal||[]).map(f => (
                    <div key={f.id} className={styles.fbItem}>
                      <div className={styles.fbItemHead}>
                        <span className={styles.fbCat} style={{background:'#7B6EF615',color:'#7B6EF6'}}>{f.category}</span>
                        <span className={styles.fbDate}>{f.date}</span>
                        <button className={styles.fbRemove} onClick={() => removeFeedback('internal', f.id)}>✕</button>
                      </div>
                      <div className={styles.fbText}>{f.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Client */}
            <div className={styles.fbSection}>
              <div className={styles.fbSectionHead}>
                <div className={styles.fbIcon} style={{background:'#34D39920',color:'#34D399'}}>🤝</div>
                <div>
                  <div className={styles.fbTitle}>Kunden-Feedback</div>
                  <div className={styles.fbSub}>Was der Kunde zurückgemeldet hat – fließt ebenfalls in Audits ein</div>
                </div>
              </div>
              <div className={styles.fbInput}>
                <div className={styles.fbInputRow}>
                  <select value={newClient.category} onChange={e => setNewClient(p=>({...p,category:e.target.value}))}>
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                  <input type="date" value={newClient.date} onChange={e => setNewClient(p=>({...p,date:e.target.value}))} style={{width:140}} />
                </div>
                <textarea value={newClient.text} onChange={e => setNewClient(p=>({...p,text:e.target.value}))} placeholder="z.B. Kunde möchte CTA immer in der Akzentfarbe. Keine Emojis in Headlines." rows={2} />
                <button className="btn btn-primary" style={{alignSelf:'flex-end',fontSize:12,background:'#34D399',color:'#000'}} onClick={() => addFeedback('client')} disabled={!newClient.text.trim()}>Speichern</button>
              </div>
              {(client.feedback_client||[]).length > 0 && (
                <div className={styles.fbList}>
                  {(client.feedback_client||[]).map(f => (
                    <div key={f.id} className={styles.fbItem}>
                      <div className={styles.fbItemHead}>
                        <span className={styles.fbCat} style={{background:'#34D39915',color:'#34D399'}}>{f.category}</span>
                        <span className={styles.fbDate}>{f.date}</span>
                        <button className={styles.fbRemove} onClick={() => removeFeedback('client', f.id)}>✕</button>
                      </div>
                      <div className={styles.fbText}>{f.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* BRAND KIT TAB */}
        {tab === 'brand' && (
          <div className="fade-in">
            <div className={styles.brandGrid}>
              <div className={styles.brandCard}>
                <div className={styles.brandCardTitle}>Farben</div>
                <div className={styles.colorRow}>
                  {[
                    { label: 'Primär', val: client.color_primary },
                    { label: 'Sekundär', val: client.color_secondary },
                    { label: 'Akzent', val: client.color_accent },
                  ].filter(c => c.val).map(c => (
                    <div key={c.label} className={styles.colorItem}>
                      <div className={styles.colorDot} style={{background:c.val}} />
                      <div className={styles.colorLabel}>{c.label}</div>
                      <div className={styles.colorHex}>{c.val}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.brandCard}>
                <div className={styles.brandCardTitle}>Schrift</div>
                <div className={styles.fontPreview} style={{fontFamily:client.font}}>
                  {client.font ? <>
                    <div style={{fontSize:20,fontWeight:400}}>{client.font}</div>
                    <div style={{fontSize:14,opacity:.7}}>Aa Bb Cc 123</div>
                  </> : <div style={{color:'var(--text-3)',fontSize:13}}>Keine Schrift hinterlegt</div>}
                </div>
              </div>
              {(client.tones||[]).length > 0 && (
                <div className={styles.brandCard}>
                  <div className={styles.brandCardTitle}>Tonalität</div>
                  <div className={styles.toneRow}>
                    {client.tones.map(t => <span key={t} className={styles.tonePill}>{t}</span>)}
                  </div>
                </div>
              )}
              {client.donts && (
                <div className={styles.brandCard}>
                  <div className={styles.brandCardTitle}>Verbote</div>
                  <div style={{fontSize:13,color:'var(--text-2)',lineHeight:1.6}}>{client.donts}</div>
                </div>
              )}
            </div>
            <button className="btn btn-secondary" style={{marginTop:16,fontSize:12}} onClick={() => setShowEdit(true)}>Brand Kit bearbeiten</button>
          </div>
        )}
      </div>

      {showEdit && (
        <ClientModal
          client={client}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setClient(updated); setShowEdit(false) }}
        />
      )}
    </div>
  )
}
