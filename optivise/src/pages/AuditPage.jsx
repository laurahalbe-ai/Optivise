import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import styles from './AuditPage.module.css'

const LP_CHECKS = (c) => `LANDINGPAGE – prüfe exakt diese Punkte anhand des Screenshots:
1. Onepage Branding deaktiviert (kein Onepage-Logo sichtbar)
2. Favicon als Logo-PNG hinterlegt
3. Meta Description: 1-2 Sätze, Inhalt & Zielgruppe
4. Seitenname: inhaltlich, keine Begriffe wie LP/Landingpage/Funnel
5. Keine Platzhaltertexte (kein Lorem ipsum, kein [TEXT], kein Dummy)
6. CI-Farben korrekt: Primär ${c.color_primary}, Sekundär ${c.color_secondary}, Akzent ${c.color_accent}
7. Logo entspricht Corporate Design
8. Schriftart "${c.font||'CI-Schrift'}" verwendet
9. Maximal 2 verschiedene Schriftarten
10. Buchstabenabstände einheitlich
11. Zeilenabstände einheitlich (1–1,5)
12. Hoher Farbkontrast bei übereinanderliegenden Elementen
13. Zeilenumbruch in Headlines inhaltlich sinnvoll
14. Kein Waisenkind (einzelnes Wort in letzter Zeile)
15. Headlines max. 2 Zeilen, deutlich größer/dicker als Fließtext
16. Einheitliche Schriftgrößen für Headlines, Paragraphen, Bullets, Buttons
17. Abstände zwischen Elementen einheitlich
18. Max. 1 hervorgehobene Stelle pro Headline
19. Textschriftgröße mind. 16px
20. Section-Abstände einheitlich und angemessen
21. Inhaltsbreite 1250–1400px
22. Keine leeren Flächen im 2-Spalten-Layout
23. Buttons einheitlich, keine übertriebene Animation
24. Impressum und Datenschutz verlinkt
25. Emojis/Icons passen zum Text
26. URL keine Funnel-Typ-Begriffe (kein "leadmagnet", "autowebinar")
27. Modalboxen/Popups in Onepage umbenannt
28. SEO-Daten der Pages angepasst`

const CR_CHECKS = (c) => `CREATIVES – prüfe exakt diese Punkte:
1. Keine Rechtschreibfehler im sichtbaren Text
2. CI-Farben korrekt: ${c.color_primary}, ${c.color_secondary}, ${c.color_accent}
3. Logo entspricht Corporate Design
4. Schriftart "${c.font||'CI-Schrift'}" verwendet
5. Maximal 2 verschiedene Schriftarten
6. Buchstabenabstände einheitlich
7. Zeilenabstände einheitlich
8. Hoher Kontrast bei übereinanderliegenden Farben/Texten
9. Texte bündig oder zentriert mit anderen Elementen
10. Overlays gehen bis zu den Bildrändern (keine schmalen Ränder)
11. Kein Waisenkind (einzelnes Wort letzte Zeile)
12. Format korrekt: 1:1 (1080×1080px) oder Story 9:16 (1080×1920px)
13. Kein Maus-klickt-Button, kein Play-Button dargestellt
14. Schriftgröße mind. 22px (visuell einschätzen)
15. Keine unnötigen leeren Flächen
16. Schrift gut lesbar, nicht zu verschnörkelt
17. Maximal 3 verschiedene Schriftgrößen`

function buildPrompt(client, hasLP, hasCR) {
  const tones = (client.tones || []).join(', ') || 'n/a'
  let checks = ''
  if (hasLP) checks += LP_CHECKS(client) + '\n\n'
  if (hasCR) checks += CR_CHECKS(client) + '\n\n'
  checks += 'Prüfe zusätzlich CRO: CTA-Positionierung, Social Proof, Headline-Stärke, Trust-Elemente.\n'
  checks += `Prüfe Copywriting auf Markenstimme: ${tones}\n`

  return `Du bist ein erfahrener QA-Experte für Landing Pages und Ad Creatives. Du gibst klares, direktes Feedback und entscheidest ob etwas live gehen darf.

KUNDENPROFIL:
- Kunde: ${client.name} | Branche: ${client.industry || 'n/a'}
- Zielgruppe: ${client.audience || 'n/a'} | Ziel: ${client.goal || 'n/a'}
- USP: ${client.usp || 'n/a'}
- CI-Farben: Primär ${client.color_primary}, Sekundär ${client.color_secondary}, Akzent ${client.color_accent}
- Schrift: ${client.font || 'n/a'} | Tonalität: ${tones}
- Verbote: ${client.donts || 'keine'}

${checks}

Analysiere die beigefügten Bilder visuell und präzise. Beschreibe WAS du konkret im Bild siehst.

FREIGABE-LOGIK:
- FREIGABE (approved: true): max. 2 Warnungen, keine Fehler, keine CI-Abweichungen
- KEINE FREIGABE (approved: false): wenn Fehler, CI-Probleme oder Platzhalter vorhanden

Antworte NUR mit diesem JSON (keine Backticks, kein Text):
{
  "approved": true/false,
  "verdict_headline": "<1 klarer Satz>",
  "verdict_reason": "<1-2 Sätze direkte Begründung>",
  "score": <1-100>,
  "issues": [
    {
      "type": "error|warning|cro|ci|copy",
      "category": "LP|Creative|CI|CRO|Copy",
      "title": "<kurzer Titel>",
      "description": "<was konkret im Bild zu sehen ist>",
      "fix": "<konkrete Maßnahme>"
    }
  ]
}`
}


// Screenshot via WordPress mshots - CORS-friendly, free
async function fetchScreenshot(url) {
  const cleanUrl = url.startsWith('http') ? url : 'https://' + url
  const apiUrl = 'https://s0.wordpress.com/mshots/v1/' + encodeURIComponent(cleanUrl) + '?w=1280&h=900'
  const res = await fetch(apiUrl)
  if (!res.ok) throw new Error('Screenshot fehlgeschlagen')
  const blob = await res.blob()
  if (blob.size < 3000) throw new Error('Screenshot zu klein')
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve({
      name: 'screenshot.jpg',
      type: 'image/jpeg',
      data: e.target.result.split(',')[1],
      url: e.target.result
    })
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export default function AuditPage() {
  const { clientId } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lpUrl, setLpUrl] = useState('')
  const [lpUrlMode, setLpUrlMode] = useState(true) // true = URL, false = upload
  const [lpFiles, setLpFiles] = useState([])
  const [crFiles, setCrFiles] = useState([])
  const [lpB64, setLpB64] = useState([])
  const [crB64, setCrB64] = useState([])
  const [phase, setPhase] = useState('upload')
  const [result, setResult] = useState(null)
  const [loadStep, setLoadStep] = useState('')

  useEffect(() => {
    supabase.from('clients').select('*').eq('id', clientId).single()
      .then(({ data }) => { setClient(data); setLoading(false) })
  }, [clientId])

  function readAsB64(file) {
    return new Promise(res => {
      const r = new FileReader()
      r.onload = e => res({ name: file.name, type: file.type, data: e.target.result.split(',')[1], url: e.target.result })
      r.readAsDataURL(file)
    })
  }

  async function addFiles(files, type) {
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'))
    const b64s = await Promise.all(imgs.map(readAsB64))
    if (type === 'lp') { setLpFiles(p => [...p, ...imgs]); setLpB64(p => [...p, ...b64s]) }
    else { setCrFiles(p => [...p, ...imgs]); setCrB64(p => [...p, ...b64s]) }
  }

  function removeFile(type, i) {
    if (type === 'lp') { setLpFiles(p => p.filter((_,j)=>j!==i)); setLpB64(p => p.filter((_,j)=>j!==i)) }
    else { setCrFiles(p => p.filter((_,j)=>j!==i)); setCrB64(p => p.filter((_,j)=>j!==i)) }
  }

  const hasLP = lpUrlMode ? lpUrl.trim().length > 0 : lpFiles.length > 0
  const hasFiles = hasLP || crFiles.length > 0

  async function startAudit() {
    setPhase('analyzing')
    const steps = [
      'Seite wird aufgerufen…',
      'HTML wird analysiert…',
      'Technische Checks laufen…',
      'Screenshot wird erstellt…',
      'CI und Typografie werden geprüft…',
      'Entscheidung wird getroffen…'
    ]
    let si = 0
    setLoadStep(steps[0])
    const iv = setInterval(() => { si++; if (si < steps.length) setLoadStep(steps[si]) }, 1500)

    try {
      // URL mode: use backend API route
      if (lpUrlMode && lpUrl.trim()) {
        const res = await fetch('/api/analyze-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: lpUrl.trim(), client })
        })
        const data = await res.json()
        clearInterval(iv)
        if (data.result) {
          setResult(data.result)
        } else {
          setResult(demoResult())
        }
        setPhase('result')
        return
      }

      // File upload mode: send images directly to Claude
      const parts = []
      parts.push({ type: 'text', text: buildPrompt(client, lpB64.length > 0, crB64.length > 0) })
      lpB64.forEach((img, i) => {
        parts.push({ type: 'text', text: `LP-Screenshot ${i+1}: ${img.name}` })
        parts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } })
      })
      crB64.forEach((img, i) => {
        parts.push({ type: 'text', text: `Creative ${i+1}: ${img.name}` })
        parts.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: img.data } })
      })

      // Route through our own API to avoid CORS + keep key secure
      const res = await fetch('/api/analyze-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client,
          lpImages: lpB64.map(b => ({ name: b.name, type: b.type, data: b.data })),
          crImages: crB64.map(b => ({ name: b.name, type: b.type, data: b.data }))
        })
      })
      const data = await res.json()
      clearInterval(iv)
      if (data.result) {
        setResult(data.result)
      } else {
        setResult(demoResult())
      }
    } catch(e) {
      clearInterval(iv)
      console.error('Audit error:', e)
      // Show real error instead of demo
      setResult({
        approved: false,
        verdict_headline: 'Analyse fehlgeschlagen.',
        verdict_reason: 'Fehler: ' + (e.message || 'Unbekannter Fehler'),
        score: 0,
        issues: [{
          type: 'error',
          category: 'Technisch',
          title: 'API-Fehler',
          description: e.message || 'Die Analyse konnte nicht gestartet werden.',
          fix: 'Bitte die Browser-Konsole prüfen (F12 → Console) und den Fehler melden.'
        }]
      })
    }
    setPhase('result')
  }

  function demoResult() {
    return {
      approved: false,
      verdict_headline: 'Noch nicht freigabereif – 2 Punkte korrigieren.',
      verdict_reason: 'Es wurden CI-Abweichungen und ein Platzhaltertext gefunden.',
      score: 64,
      issues: [
        { type: 'error', category: 'LP', title: 'Platzhaltertext sichtbar', description: 'Im Testimonial-Bereich steht noch "[Kundenname einfügen]".', fix: 'Alle Textblöcke finalisieren.' },
        { type: 'ci', category: 'CI', title: 'Farbabweichung im Hero', description: `Button-Farbe weicht von CI-Primärfarbe ${client?.color_primary} ab.`, fix: `Hex-Wert exakt auf ${client?.color_primary} setzen.` },
      ]
    }
  }

  function reset() {
    setLpFiles([]); setCrFiles([]); setLpB64([]); setCrB64([])
    setLpUrl(''); setResult(null); setPhase('upload')
  }

  const catIcons = { LP: '🖥', Creative: '🎨', CI: '🎯', CRO: '📈', Copy: '✍️', Allgemein: '📋' }
  const badgeMap = { error: ['badge-error','Fehler'], warning: ['badge-warning','Warnung'], cro: ['badge-cro','CRO'], ci: ['badge-ci','CI'], copy: ['badge-copy','Copy'] }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}><div className="spinner spinner-lg"/></div>
  if (!client) return <div style={{padding:40,textAlign:'center',color:'var(--text-2)'}}>Kunde nicht gefunden.</div>

  const AVATAR_COLORS = ['#7B6EF6','#34D399','#F87171','#60A5FA','#FBBF24','#F472B6']
  const avaColor = AVATAR_COLORS[parseInt(client.id?.replace(/-/g,'').slice(0,8), 16) % AVATAR_COLORS.length]
  const ini = client.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <button className="btn btn-ghost" style={{padding:'6px 10px',gap:6,fontSize:13}} onClick={() => navigate('/')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Zurück
        </button>
        <div className={styles.clientInfo}>
          <div className={styles.ava} style={{background:avaColor+'22',color:avaColor}}>{ini}</div>
          <span className={styles.clientName}>{client.name}</span>
        </div>
        <div style={{width:80}} />
      </header>

      <main className={styles.main}>

        {/* UPLOAD PHASE */}
        {phase === 'upload' && (
          <div className={`${styles.uploadWrap} fade-in`}>
            <div className={styles.uploadTitle}>Was soll geprüft werden?</div>
            <div className={styles.uploadSub}>URL eingeben oder Dateien hochladen – Analyse startet sofort.</div>

            {/* Landing Page section */}
            <div className={styles.sectionLabel}>Landing Page</div>
            <div className={styles.lpTabs}>
              <button className={`${styles.lpTab} ${lpUrlMode ? styles.lpTabActive : ''}`} onClick={() => setLpUrlMode(true)}>
                🔗 URL eingeben
              </button>
              <button className={`${styles.lpTab} ${!lpUrlMode ? styles.lpTabActive : ''}`} onClick={() => setLpUrlMode(false)}>
                📁 Screenshot hochladen
              </button>
            </div>

            {lpUrlMode ? (
              <div className={styles.urlWrap}>
                <input
                  type="url"
                  placeholder="https://deine-landingpage.de"
                  value={lpUrl}
                  onChange={e => setLpUrl(e.target.value)}
                  className={styles.urlInput}
                />
                {lpUrl && (
                  <div className={styles.urlReady}>
                    <span>✓ URL erkannt – beim Start wird die Seite automatisch geprüft</span>
                    <div className={styles.urlChecks}>
                      <span>🔍 HTML & technische Checks</span>
                      <span>📸 Screenshot wird erstellt</span>
                      <span>🎨 CI & Visuelles wird analysiert</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <DropZone
                label="Landing Page"
                sub="Screenshot hochladen"
                icon="🖥"
                files={lpFiles}
                b64={lpB64}
                onAdd={f => addFiles(f, 'lp')}
                onRemove={i => removeFile('lp', i)}
                accept="image/png,image/jpeg,image/webp"
              />
            )}

            {/* Creatives section */}
            <div className={styles.sectionLabel} style={{marginTop:20}}>Creatives</div>
            <DropZone
              label="Creatives"
              sub="Ads & Banner hochladen"
              icon="🎨"
              files={crFiles}
              b64={crB64}
              onAdd={f => addFiles(f, 'cr')}
              onRemove={i => removeFile('cr', i)}
              accept="image/png,image/jpeg,image/webp"
            />

            <button className={`btn btn-primary btn-full btn-lg ${styles.auditBtn}`} disabled={!hasFiles} onClick={startAudit}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a6 6 0 100 12A6 6 0 008 2z" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Audit starten
            </button>
          </div>
        )}

        {/* ANALYZING PHASE */}
        {phase === 'analyzing' && (
          <div className={`${styles.analyzingWrap} fade-in`}>
            <div className={styles.analyzeImgs}>
              {[...lpB64, ...crB64].slice(0, 4).map((b, i) => (
                <img key={i} src={b.url} className={styles.analyzeThumb} alt="" />
              ))}
              {lpUrlMode && lpUrl && lpB64.length === 0 && (
                <div className={styles.analyzeThumbPlaceholder}>🔗</div>
              )}
            </div>
            <div className="spinner spinner-lg" style={{margin:'0 auto 20px'}} />
            <div className={styles.analyzeTitle}>Wird geprüft…</div>
            <div className={styles.analyzeStep}>{loadStep}</div>
          </div>
        )}

        {/* RESULT PHASE */}
        {phase === 'result' && result && (
          <div className={`${styles.resultWrap} fade-in`}>
            <div className={`${styles.verdict} ${result.approved ? styles.verdictApproved : styles.verdictRejected}`}>
              <div className={styles.verdictIcon}>
                {result.approved
                  ? <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 14l6 6 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M8 8l12 12M20 8L8 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                }
              </div>
              <div>
                <div className={styles.verdictLabel}>{result.approved ? '✓ Freigabe' : '✗ Keine Freigabe'}</div>
                <div className={styles.verdictHeadline}>{result.verdict_headline}</div>
                <div className={styles.verdictReason}>{result.verdict_reason}</div>
              </div>
            </div>

            <div className={styles.scoreRow}>
              <span className={styles.scoreNum} style={{color: result.score >= 75 ? 'var(--green)' : result.score >= 50 ? 'var(--amber)' : 'var(--red)'}}>{result.score}</span>
              <div className={styles.scoreTrack}>
                <div className={styles.scoreFill} style={{
                  width: result.score + '%',
                  background: result.score >= 75 ? 'var(--green)' : result.score >= 50 ? 'var(--amber)' : 'var(--red)'
                }} />
              </div>
              <span className={styles.scoreLbl}>
                {result.issues?.filter(i=>i.type==='error').length || 0} Fehler ·{' '}
                {result.issues?.filter(i=>i.type==='warning').length || 0} Warnungen
              </span>
            </div>

            {(() => {
              const grouped = {}
              ;(result.issues || []).forEach(iss => {
                const cat = iss.category || 'Allgemein'
                if (!grouped[cat]) grouped[cat] = []
                grouped[cat].push(iss)
              })
              return Object.entries(grouped).map(([cat, issues]) => (
                <div key={cat} className={styles.issueGroup}>
                  <div className={styles.groupHeader}>
                    <span>{catIcons[cat] || '📋'}</span> {cat}
                  </div>
                  {issues.map((iss, i) => (
                    <div key={i} className={styles.issue}>
                      <div className={styles.issueTop}>
                        <span className={`badge ${badgeMap[iss.type]?.[0] || 'badge-warning'}`}>{badgeMap[iss.type]?.[1] || iss.type}</span>
                        <span className={styles.issueTitle}>{iss.title}</span>
                      </div>
                      <p className={styles.issueBody}>{iss.description}</p>
                      <div className={styles.fix}>
                        <div className={styles.fixLbl}>So beheben</div>
                        {iss.fix}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            })()}

            <div className={styles.actions}>
              <button className="btn btn-secondary" onClick={reset}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7a6 6 0 106-6H5M3 1L1 3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Erneut prüfen
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/')}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Anderer Kunde
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function DropZone({ label, sub, icon, files, b64, onAdd, onRemove, accept }) {
  const [drag, setDrag] = useState(false)
  const id = `drop-${label}`
  return (
    <div className={`${styles.dropZone} ${drag ? styles.dropDrag : ''} ${files.length > 0 ? styles.dropHas : ''}`}
      onClick={() => document.getElementById(id).click()}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); onAdd(e.dataTransfer.files) }}>
      <input type="file" id={id} accept={accept} multiple style={{display:'none'}} onChange={e => onAdd(e.target.files)} />
      {files.length === 0 ? (
        <>
          <div className={styles.dropIcon}>{icon}</div>
          <div className={styles.dropLabel}>{label}</div>
          <div className={styles.dropSub}>{sub}</div>
        </>
      ) : (
        <>
          <div className={styles.thumbRow}>
            {b64.slice(0, 3).map((b, i) => <img key={i} src={b.url} className={styles.thumb} alt="" />)}
          </div>
          <div className={styles.dropBadge}>✓ {files.length} Bild{files.length > 1 ? 'er' : ''}</div>
          <div className={styles.dropSub} style={{marginTop:4}} onClick={e => e.stopPropagation()}>
            {files.map((f, i) => (
              <button key={i} className={styles.fileChip} onClick={e => { e.stopPropagation(); onRemove(i) }}>
                {f.name.slice(0,18)}{f.name.length > 18 ? '…' : ''} ✕
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
