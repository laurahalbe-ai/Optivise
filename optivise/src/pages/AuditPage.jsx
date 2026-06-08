import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import styles from './AuditPage.module.css'

const AVATAR_COLORS = ['#7B6EF6','#34D399','#F87171','#60A5FA','#FBBF24','#F472B6']
function avaColor(id) { return AVATAR_COLORS[parseInt(id?.replace(/-/g,'').slice(0,8),16) % AVATAR_COLORS.length] }
function ini(name) { return name?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?' }

function buildPrompt(c, hasLP, hasCR, hasVideo) {
  const tones = (c.tones||[]).join(', ') || 'n/a'
  const feedbackBlock = [...(c.feedback_internal||[]).slice(0,5).map(f=>`- [Team/${f.category}] ${f.text}`),...(c.feedback_client||[]).slice(0,5).map(f=>`- [Kunde/${f.category}] ${f.text}`)].join('\n')

  return `Du bist ein Senior QA-Experte für Marketing-Assets. Direkt, professionell, wohlwollend.

KUNDENPROFIL:
- Kunde: ${c.name||'?'} | Branche: ${c.industry||'n/a'}
- Zielgruppe: ${c.audience||'n/a'} | Ziel: ${c.goal||'n/a'}
- USP: ${c.usp||'n/a'}
- CI: Primär ${c.color_primary||'n/a'}, Sekundär ${c.color_secondary||'n/a'}, Akzent ${c.color_accent||'n/a'}
- Schrift: ${c.font||'n/a'} | Ton: ${tones}
- Verbote: ${c.donts||'keine'}
${feedbackBlock ? `\nGELERNTES FEEDBACK (berücksichtigen):\n${feedbackBlock}` : ''}

${hasLP ? `LANDING PAGE – prüfe:
□ Onepage-Branding deaktiviert | □ Keine Platzhaltertexte | □ CI-Farben (${c.color_primary}, ${c.color_secondary}, ${c.color_accent})
□ Schrift "${c.font||'n/a'}", max. 2 Schriftarten | □ Zeilenabstand 1-1,5 | □ Hoher Kontrast
□ Kein Waisenkind | □ Headlines max. 2 Zeilen | □ CTA above fold | □ Buttons einheitlich
□ Abstände einheitlich | □ Impressum & Datenschutz | □ URL ohne Funnel-Begriffe` : ''}

${hasCR ? `CREATIVES – prüfe:
□ Keine Rechtschreibfehler | □ CI-Farben (${c.color_primary}, ${c.color_secondary}, ${c.color_accent})
□ Schrift "${c.font||'n/a'}", max. 2 Schriftarten, max. 3 Schriftgrößen
□ Hoher Kontrast | □ Texte bündig/zentriert | □ Overlays bis zum Rand | □ Kein Waisenkind
□ Format 1:1 oder 9:16 | □ Kein Play-Button | □ Keine leeren Flächen | □ Schrift lesbar` : ''}

${hasVideo ? `VIDEO – prüfe anhand der Frames:
□ Untertitel: Rechtschreibung, Lesbarkeit, Kontrast, Position (nicht zu nah am Rand)
□ Untertitel-Design: Schrift, Größe, Hintergrund/Box lesbar
□ CI-Konformität: Farben, Logos, Overlays, Intro/Outro
□ Allgemeiner visueller Eindruck: Belichtung, Bildstabilität, Schnitt erkennbar
□ Keine sichtbaren Fehler (verpixelt, abgeschnitten, falsche Grafiken)` : ''}

CONVERSION (immer):
- Hauptbotschaft klar? CTA stark? Trust-Signale?

VERHALTEN:
- Sei wohlwollend – kein Perfektionismus
- Kontrast nur bemängeln wenn wirklich unleserlich
- Schriftgrößen: nur visuell bewerten, keine px-Zahlen
- Unsicher? → type="hint" (zählt nicht zur Ablehnung)

FREIGABE: approved=true bei max. 2 Warnungen, keinen Fehlern (hints zählen nicht).

JSON (keine Backticks):
{"approved":true,"verdict_headline":"1 Satz","verdict_reason":"1-2 Sätze","score":85,"issues":[{"type":"error|warning|cro|ci|copy|hint","category":"LP|Creative|Video|CI|CRO|Copy","title":"...","description":"konkret was sichtbar","fix":"Maßnahme"}]}`
}

async function extractVideoFrames(file, count = 6) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.src = URL.createObjectURL(file)
    video.muted = true
    const frames = []
    video.onloadedmetadata = () => {
      const duration = video.duration
      const times = Array.from({length: count}, (_, i) => (duration / (count + 1)) * (i + 1))
      let captured = 0
      const canvas = document.createElement('canvas')
      const MAX = 640
      
      function captureFrame(time) {
        video.currentTime = time
      }
      
      video.onseeked = () => {
        const w = video.videoWidth, h = video.videoHeight
        const scale = Math.min(MAX/w, MAX/h, 1)
        canvas.width = Math.round(w*scale)
        canvas.height = Math.round(h*scale)
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.65)
        frames.push({ name: `frame_${captured+1}.jpg`, type: 'image/jpeg', data: dataUrl.split(',')[1], url: dataUrl })
        captured++
        if (captured < times.length) {
          captureFrame(times[captured])
        } else {
          URL.revokeObjectURL(video.src)
          resolve(frames)
        }
      }
      captureFrame(times[0])
    }
    video.onerror = () => resolve([])
  })
}

function compressImage(file) {
  return new Promise(res => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 800
      let w = img.width, h = img.height
      if (w > MAX) { h = Math.round(h*MAX/w); w = MAX }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.70)
      URL.revokeObjectURL(url)
      res({ name: file.name, type: 'image/jpeg', data: dataUrl.split(',')[1], url: dataUrl })
    }
    img.src = url
  })
}

export default function AuditPage() {
  const { clientId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [auditType, setAuditType] = useState('creative') // creative | lp | video
  const [lpUrl, setLpUrl] = useState('')
  const [lpFiles, setLpFiles] = useState([])
  const [crFiles, setCrFiles] = useState([])
  const [videoFiles, setVideoFiles] = useState([])
  const [lpB64, setLpB64] = useState([])
  const [crB64, setCrB64] = useState([])
  const [videoFrames, setVideoFrames] = useState([])
  const [phase, setPhase] = useState('upload') // upload | analyzing | result
  const [result, setResult] = useState(null)
  const [loadStep, setLoadStep] = useState('')
  const [ratings, setRatings] = useState({}) // issueIndex -> { rating: 'ok'|'wrong', note }
  const [savedRatings, setSavedRatings] = useState({})
  const [pastAudit, setPastAudit] = useState(null)

  useEffect(() => {
    supabase.from('clients').select('*').eq('id', clientId).single()
      .then(({ data }) => { setClient(data); setLoading(false) })

    const auditId = searchParams.get('auditId')
    if (auditId) {
      supabase.from('audits').select('*').eq('id', auditId).single()
        .then(({ data }) => {
          if (data) {
            setPastAudit(data)
            setResult(data)
            setPhase('result')
          }
        })
    }
  }, [clientId])

  async function addFiles(files, type) {
    if (type === 'video') {
      const f = files[0]
      if (!f) return
      setVideoFiles([f])
      setLoadStep('Video-Frames werden extrahiert…')
      const frames = await extractVideoFrames(f)
      setVideoFrames(frames)
      setLoadStep('')
      return
    }
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'))
    const b64s = await Promise.all(imgs.map(compressImage))
    if (type === 'lp') { setLpFiles(p=>[...p,...imgs]); setLpB64(p=>[...p,...b64s]) }
    else { setCrFiles(p=>[...p,...imgs]); setCrB64(p=>[...p,...b64s]) }
  }

  function removeFile(type, i) {
    if (type === 'lp') { setLpFiles(p=>p.filter((_,j)=>j!==i)); setLpB64(p=>p.filter((_,j)=>j!==i)) }
    else if (type === 'cr') { setCrFiles(p=>p.filter((_,j)=>j!==i)); setCrB64(p=>p.filter((_,j)=>j!==i)) }
    else { setVideoFiles([]); setVideoFrames([]) }
  }

  const hasContent = auditType === 'lp' ? (lpUrl.trim() || lpFiles.length > 0)
    : auditType === 'video' ? videoFrames.length > 0
    : crFiles.length > 0 || lpFiles.length > 0

  async function startAudit() {
    setPhase('analyzing')
    const steps = ['Assets werden analysiert…','CI und Design werden geprüft…','Typografie wird bewertet…','Conversion wird analysiert…','Entscheidung wird getroffen…']
    let si = 0; setLoadStep(steps[0])
    const iv = setInterval(() => { si++; if (si < steps.length) setLoadStep(steps[si]) }, 1300)
    const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
    const c = client || {}

    try {
      // URL mode for LP
      if (auditType === 'lp' && lpUrl.trim() && lpFiles.length === 0) {
        const res = await fetch('/api/analyze-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: lpUrl.trim(), client: c })
        })
        const data = await res.json()
        clearInterval(iv)
        const r = data.result || { approved: false, verdict_headline: 'Fehler.', verdict_reason: data.error || 'Unbekannt.', score: 0, issues: [] }
        setResult(r)
        await saveAudit(r, 'lp', [], lpUrl.trim())
        setPhase('result')
        return
      }

      const prompt = buildPrompt(c, lpB64.length > 0, crB64.length > 0, videoFrames.length > 0)
      const allImages = [...lpB64, ...crB64, ...videoFrames]
      const parts = [{ type: 'text', text: prompt }]
      lpB64.forEach((img,i) => { parts.push({type:'text',text:`LP-Screenshot ${i+1}:`}); parts.push({type:'image',source:{type:'base64',media_type:img.type,data:img.data}}) })
      crB64.forEach((img,i) => { parts.push({type:'text',text:`Creative ${i+1}:`}); parts.push({type:'image',source:{type:'base64',media_type:img.type,data:img.data}}) })
      videoFrames.forEach((img,i) => { parts.push({type:'text',text:`Video Frame ${i+1}:`}); parts.push({type:'image',source:{type:'base64',media_type:img.type,data:img.data}}) })

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'x-api-key':ANTHROPIC_KEY, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
        body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:2000, messages:[{role:'user',content:parts}] })
      })
      if (!res.ok) throw new Error(`Claude API ${res.status}`)
      const data = await res.json()
      clearInterval(iv)
      const txt = data.content?.map(b=>b.text||'').join('') || ''
      let parsed; try { parsed = JSON.parse(txt.replace(/```json|```/g,'').trim()) } catch { parsed = null }
      const r = parsed || { approved: false, verdict_headline: 'Antwort konnte nicht verarbeitet werden.', verdict_reason: txt.slice(0,200), score: 0, issues: [] }
      setResult(r)
      const type = videoFrames.length > 0 ? 'video' : lpB64.length > 0 && crB64.length > 0 ? 'mixed' : lpB64.length > 0 ? 'lp' : 'creative'
      const fileNames = [...lpFiles, ...crFiles, ...videoFiles].map(f=>f.name)
      await saveAudit(r, type, fileNames, '')
    } catch(e) {
      clearInterval(iv)
      setResult({ approved:false, verdict_headline:'Analyse fehlgeschlagen.', verdict_reason:e.message, score:0, issues:[{type:'error',category:'Technisch',title:'Fehler',description:e.message,fix:'Seite neu laden.'}] })
    }
    setPhase('result')
  }

  async function saveAudit(r, type, fileNames, url) {
    try {
      await supabase.from('audits').insert({
        client_id: clientId,
        type, score: r.score, approved: r.approved,
        verdict_headline: r.verdict_headline, verdict_reason: r.verdict_reason,
        issues: r.issues || [], file_names: fileNames, url
      })
    } catch(e) { console.error('Save audit error:', e) }
  }

  async function saveRating(issueIndex, rating, note) {
    const key = `${issueIndex}`
    const updated = { ...ratings, [key]: { rating, note } }
    setRatings(updated)
    setSavedRatings(s => ({ ...s, [key]: true }))

    // Save as internal feedback
    try {
      const { data: clientData } = await supabase.from('clients').select('feedback_internal').eq('id', clientId).single()
      const existing = clientData?.feedback_internal || []
      const iss = result.issues[issueIndex]
      const entry = {
        id: Date.now(), category: iss.category || 'Allgemein', date: new Date().toISOString().slice(0,10),
        text: `[${rating === 'ok' ? '✓ Korrekt' : '✗ Falsch'} bewertet: "${iss.title}"]${note ? ` – ${note}` : ''}`
      }
      await supabase.from('clients').update({ feedback_internal: [entry, ...existing] }).eq('id', clientId)
    } catch(e) { console.error(e) }
  }

  function reset() {
    setLpFiles([]); setCrFiles([]); setVideoFiles([])
    setLpB64([]); setCrB64([]); setVideoFrames([])
    setLpUrl(''); setResult(null); setRatings({}); setSavedRatings({})
    setPhase('upload'); setPastAudit(null)
  }

  const badgeMap = { error:['badge-error','Fehler'], warning:['badge-warning','Warnung'], cro:['badge-cro','CRO'], ci:['badge-ci','CI'], copy:['badge-copy','Copy'], hint:['badge-hint','Hinweis'], video:['badge-ci','Video'] }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}><div className="spinner spinner-lg"/></div>
  if (!client) return null

  const color = avaColor(client.id)

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <button className="btn btn-ghost" style={{padding:'6px 10px',fontSize:13,gap:6}} onClick={() => navigate(`/client/${clientId}`)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {client.name}
        </button>
        <div className={styles.clientInfo}>
          <div className={styles.ava} style={{background:color+'22',color}}>{ini(client.name)}</div>
          <span className={styles.clientName}>{pastAudit ? 'Audit vom ' + new Date(pastAudit.created_at).toLocaleDateString('de-DE') : 'Neuer Audit'}</span>
        </div>
        <div style={{width:100}} />
      </header>

      <main className={styles.main}>

        {/* UPLOAD */}
        {phase === 'upload' && (
          <div className={`${styles.uploadWrap} fade-in`}>
            <div className={styles.uploadTitle}>Was soll geprüft werden?</div>

            {/* Type selector */}
            <div className={styles.typeRow}>
              {[
                { id:'creative', icon:'🎨', label:'Creatives' },
                { id:'lp', icon:'🖥', label:'Landing Page' },
                { id:'video', icon:'🎬', label:'Video' },
              ].map(t => (
                <button key={t.id} className={`${styles.typeBtn} ${auditType===t.id?styles.typeBtnOn:''}`} onClick={() => setAuditType(t.id)}>
                  <span className={styles.typeBtnIcon}>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Creatives */}
            {auditType === 'creative' && (
              <div className={styles.dropArea}>
                <DropZone label="Creatives hochladen" sub="PNG, JPG · Ads, Banner, Social Posts" accept="image/*" multiple onAdd={f => addFiles(f,'cr')} />
                <FileList files={crFiles} b64={crB64} onRemove={i => removeFile('cr',i)} />
                {lpFiles.length === 0 && (
                  <>
                    <div className={styles.alsoLabel}>Auch Landing Page Screenshot hinzufügen? (optional)</div>
                    <DropZone label="LP Screenshot" sub="PNG, JPG" accept="image/*" multiple onAdd={f => addFiles(f,'lp')} small />
                    <FileList files={lpFiles} b64={lpB64} onRemove={i => removeFile('lp',i)} />
                  </>
                )}
              </div>
            )}

            {/* Landing Page */}
            {auditType === 'lp' && (
              <div className={styles.dropArea}>
                <div className={styles.lpTabs}>
                  <button className={`${styles.lpModeBtn} ${!lpUrl?styles.lpModeBtnOn:''}`}>📁 Screenshot hochladen</button>
                  <button className={`${styles.lpModeBtn} ${lpUrl?styles.lpModeBtnOn:''}`}>🔗 URL eingeben</button>
                </div>
                <input type="url" className={styles.urlInput} placeholder="https://deine-landingpage.de" value={lpUrl} onChange={e => { setLpUrl(e.target.value); if(e.target.value) { setLpFiles([]); setLpB64([]) } }} />
                {!lpUrl && <>
                  <DropZone label="LP Screenshot hochladen" sub="PNG oder JPG" accept="image/*" multiple onAdd={f => addFiles(f,'lp')} />
                  <FileList files={lpFiles} b64={lpB64} onRemove={i => removeFile('lp',i)} />
                </>}
                {lpUrl && <div className={styles.urlReady}>✓ URL erkannt – HTML-Analyse + visuelle Prüfung beim Start</div>}
              </div>
            )}

            {/* Video */}
            {auditType === 'video' && (
              <div className={styles.dropArea}>
                <DropZone label="Video hochladen" sub="MP4, MOV · max. 500MB" accept="video/*" onAdd={f => addFiles(f,'video')} />
                {videoFiles.length > 0 && (
                  <div className={styles.videoInfo}>
                    <span>🎬 {videoFiles[0].name}</span>
                    {videoFrames.length > 0 && <span className={styles.framesReady}>✓ {videoFrames.length} Frames extrahiert</span>}
                    <button className={styles.removeVideo} onClick={() => removeFile('video',0)}>✕</button>
                  </div>
                )}
                {loadStep && <div className={styles.loadingFrames}><div className="spinner" />{loadStep}</div>}
                {videoFrames.length > 0 && (
                  <div className={styles.frameGrid}>
                    {videoFrames.map((f,i) => <img key={i} src={f.url} className={styles.frameThumb} alt={`Frame ${i+1}`} />)}
                  </div>
                )}
              </div>
            )}

            <button className={`btn btn-primary btn-full btn-lg ${styles.startBtn}`} disabled={!hasContent} onClick={startAudit}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a6 6 0 100 12A6 6 0 008 2z" stroke="currentColor" strokeWidth="1.4"/><path d="M6 5l5 3-5 3V5z" fill="currentColor"/></svg>
              Audit starten
            </button>
          </div>
        )}

        {/* ANALYZING */}
        {phase === 'analyzing' && (
          <div className={`${styles.analyzingWrap} fade-in`}>
            {[...lpB64,...crB64,...videoFrames].slice(0,4).map((b,i) => <img key={i} src={b.url} className={styles.analyzeThumb} alt="" />)}
            <div className="spinner spinner-lg" style={{margin:'0 auto 16px'}} />
            <div className={styles.analyzeTitle}>Wird analysiert…</div>
            <div className={styles.analyzeStep}>{loadStep}</div>
          </div>
        )}

        {/* RESULT */}
        {phase === 'result' && result && (
          <div className={`${styles.resultWrap} fade-in`}>
            {pastAudit && <div className={styles.pastBadge}>📋 Gespeicherter Audit vom {new Date(pastAudit.created_at).toLocaleDateString('de-DE')}</div>}

            <div className={`${styles.verdict} ${result.approved?styles.verdictOk:styles.verdictNo}`}>
              <div className={styles.verdictIcon}>
                {result.approved
                  ? <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 14l6 6 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M8 8l12 12M20 8L8 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>}
              </div>
              <div>
                <div className={styles.verdictLabel}>{result.approved ? '✓ Freigabe' : '✗ Keine Freigabe'}</div>
                <div className={styles.verdictHeadline}>{result.verdict_headline}</div>
                <div className={styles.verdictReason}>{result.verdict_reason}</div>
              </div>
            </div>

            <div className={styles.scoreRow}>
              <span className={styles.scoreNum} style={{color:result.score>=75?'var(--green)':result.score>=50?'var(--amber)':'var(--red)'}}>{result.score}</span>
              <div className={styles.scoreTrack}><div className={styles.scoreFill} style={{width:result.score+'%',background:result.score>=75?'var(--green)':result.score>=50?'var(--amber)':'var(--red)'}}/></div>
              <span className={styles.scoreLbl}>{result.issues?.filter(i=>i.type==='error').length||0} Fehler · {result.issues?.filter(i=>i.type==='warning').length||0} Warnungen</span>
            </div>

            {(result.issues||[]).length === 0 && (
              <div className={styles.allGood}>🎉 Alles sieht gut aus – keine Findings!</div>
            )}

            {(result.issues||[]).map((iss, i) => (
              <div key={i} className={styles.issue}>
                <div className={styles.issueTop}>
                  <span className={`badge ${badgeMap[iss.type]?.[0]||'badge-warning'}`}>{badgeMap[iss.type]?.[1]||iss.type}</span>
                  <span className={styles.issueTitle}>{iss.title}</span>
                </div>
                <p className={styles.issueBody}>{iss.description}</p>
                <div className={styles.fix}><div className={styles.fixLbl}>So beheben</div>{iss.fix}</div>

                {/* Rating */}
                {!pastAudit && (savedRatings[i] ? (
                  <div className={styles.ratedDone}>✓ Bewertet – fließt in zukünftige Audits ein</div>
                ) : (
                  <RatingRow issueIndex={i} iss={iss} onSave={saveRating} />
                ))}
              </div>
            ))}

            <div className={styles.actions}>
              {!pastAudit && <button className="btn btn-secondary" onClick={reset}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7a6 6 0 106-6H5M3 1L1 3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>Erneut prüfen</button>}
              <button className="btn btn-secondary" onClick={() => navigate(`/client/${clientId}`)}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>Zur Übersicht</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function RatingRow({ issueIndex, iss, onSave }) {
  const [rating, setRating] = useState(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!rating) return
    setSaving(true)
    await onSave(issueIndex, rating, note)
    setSaving(false)
  }

  return (
    <div className={styles.ratingWrap}>
      <div className={styles.ratingLabel}>War dieses Feedback hilfreich?</div>
      <div className={styles.ratingRow}>
        <button className={`${styles.ratingBtn} ${rating==='ok'?styles.ratingOk:''}`} onClick={() => setRating('ok')}>👍 Korrekt</button>
        <button className={`${styles.ratingBtn} ${rating==='wrong'?styles.ratingWrong:''}`} onClick={() => setRating('wrong')}>👎 Falsch / Nicht zutreffend</button>
      </div>
      {rating && (
        <div className={styles.ratingNote}>
          <input type="text" placeholder="Notiz hinzufügen (optional)…" value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key==='Enter' && save()} />
          <button className="btn btn-secondary" style={{fontSize:11,padding:'6px 12px'}} onClick={save} disabled={saving}>{saving?'…':'Speichern'}</button>
        </div>
      )}
    </div>
  )
}

function DropZone({ label, sub, accept, multiple, onAdd, small }) {
  const [drag, setDrag] = useState(false)
  const id = `dz-${label.replace(/\s/g,'')}`
  return (
    <div className={`${styles.dropZone} ${drag?styles.dropDrag:''} ${small?styles.dropSmall:''}`}
      onClick={() => document.getElementById(id).click()}
      onDragOver={e=>{e.preventDefault();setDrag(true)}}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);onAdd(e.dataTransfer.files)}}>
      <input type="file" id={id} accept={accept} multiple={multiple} style={{display:'none'}} onChange={e=>onAdd(e.target.files)} />
      <div className={styles.dropIcon}>{accept?.includes('video')?'🎬':accept?.includes('image')?'📁':'📎'}</div>
      <div className={styles.dropLabel}>{label}</div>
      <div className={styles.dropSub}>{sub}</div>
    </div>
  )
}

function FileList({ files, b64, onRemove }) {
  if (!files?.length) return null
  return (
    <div className={styles.fileList}>
      {files.map((f,i) => (
        <div key={i} className={styles.fileItem}>
          {b64?.[i] && <img src={b64[i].url} className={styles.fileThumb} alt="" />}
          <span className={styles.fileName}>{f.name.slice(0,30)}{f.name.length>30?'…':''}</span>
          <button className={styles.fileRm} onClick={() => onRemove(i)}>✕</button>
        </div>
      ))}
    </div>
  )
}
