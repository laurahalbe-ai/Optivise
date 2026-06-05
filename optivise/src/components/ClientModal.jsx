import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import styles from './ClientModal.module.css'

const TONES = ['Professionell','Freundlich','Mutig','Vertrauensvoll','Verspielt','Minimalistisch','Emotional','Modern','Luxuriös']

export default function ClientModal({ client, onClose, onSaved }) {
  const isEdit = !!client
  const [tab, setTab] = useState('info') // info | brand
  const [form, setForm] = useState({
    name: client?.name || '',
    industry: client?.industry || '',
    audience: client?.audience || '',
    usp: client?.usp || '',
    goal: client?.goal || '',
    color_primary: client?.color_primary || '#1a1a1a',
    color_secondary: client?.color_secondary || '#ffffff',
    color_accent: client?.color_accent || '#ff8900',
    font: client?.font || '',
    tones: client?.tones || [],
    donts: client?.donts || '',
  })
  const [colors, setColors] = useState([
    client?.color_primary || '#1a1a1a',
    client?.color_secondary || '#ffffff',
    client?.color_accent || '#ff8900',
  ])
  const [logos, setLogos] = useState([]) // { url, name }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const logoInputRef = useRef()

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function toggleTone(t) {
    set('tones', form.tones.includes(t) ? form.tones.filter(x => x !== t) : [...form.tones, t])
  }

  function addColor() {
    if (colors.length < 8) setColors(c => [...c, '#cccccc'])
  }

  function updateColor(i, val) {
    const next = [...colors]
    next[i] = val
    setColors(next)
    if (i === 0) set('color_primary', val)
    if (i === 1) set('color_secondary', val)
    if (i === 2) set('color_accent', val)
  }

  function removeColor(i) {
    if (colors.length <= 1) return
    const next = colors.filter((_, j) => j !== i)
    setColors(next)
  }

  function handleLogoUpload(e) {
    const files = Array.from(e.target.files)
    files.forEach(f => {
      const reader = new FileReader()
      reader.onload = ev => setLogos(l => [...l, { url: ev.target.result, name: f.name }])
      reader.readAsDataURL(f)
    })
  }

  function removeLogo(i) {
    setLogos(l => l.filter((_, j) => j !== i))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Kundenname ist Pflicht.'); return }
    setLoading(true); setError('')
    const payload = {
      ...form,
      color_primary: colors[0] || form.color_primary,
      color_secondary: colors[1] || form.color_secondary,
      color_accent: colors[2] || form.color_accent,
    }
    let result
    if (isEdit) {
      const { data, error } = await supabase.from('clients').update(payload).eq('id', client.id).select().single()
      if (error) { setError(error.message); setLoading(false); return }
      result = data
    } else {
      const { data, error } = await supabase.from('clients').insert(payload).select().single()
      if (error) { setError(error.message); setLoading(false); return }
      result = data
    }
    setLoading(false)
    onSaved(result, !isEdit)
  }

  return (
    <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.clientDot} style={{ background: colors[0] || '#7B6EF6' }} />
            <h2 className={styles.title}>{isEdit ? form.name || 'Kunde bearbeiten' : 'Neuer Kunde'}</h2>
          </div>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tabBtn} ${tab === 'info' ? styles.tabActive : ''}`} onClick={() => setTab('info')}>
            Kundendaten
          </button>
          <button className={`${styles.tabBtn} ${tab === 'brand' ? styles.tabActive : ''}`} onClick={() => setTab('brand')}>
            Brand Kit
          </button>
        </div>

        <div className={styles.body}>

          {/* TAB: Kundendaten */}
          {tab === 'info' && (
            <div className={styles.fadeIn}>
              <div className={styles.row2}>
                <div className={styles.fg}>
                  <label className="label">Name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="z.B. Müller GmbH" />
                </div>
                <div className={styles.fg}>
                  <label className="label">Branche</label>
                  <select value={form.industry} onChange={e => set('industry', e.target.value)}>
                    <option value="">Branche…</option>
                    <option>E-Commerce</option>
                    <option>SaaS / Software</option>
                    <option>Gesundheit & Beauty</option>
                    <option>Finance / Versicherung</option>
                    <option>Immobilien</option>
                    <option>Bildung</option>
                    <option>B2B Services</option>
                    <option>Gastronomie / Retail</option>
                    <option>Sonstige</option>
                  </select>
                </div>
              </div>
              <div className={styles.fg}>
                <label className="label">Zielgruppe</label>
                <input value={form.audience} onChange={e => set('audience', e.target.value)} placeholder="z.B. Frauen 25–45, urban, kauffreudig" />
              </div>
              <div className={styles.fg}>
                <label className="label">USP / Kernbotschaft</label>
                <textarea value={form.usp} onChange={e => set('usp', e.target.value)} placeholder="Was macht den Kunden einzigartig?" rows={2} />
              </div>
              <div className={styles.fg}>
                <label className="label">Ziel der Landing Page</label>
                <select value={form.goal} onChange={e => set('goal', e.target.value)}>
                  <option value="">Ziel…</option>
                  <option>Lead-Generierung</option>
                  <option>Direktkauf / Checkout</option>
                  <option>App-Download</option>
                  <option>Demo buchen</option>
                  <option>Newsletter-Anmeldung</option>
                  <option>Termin vereinbaren</option>
                </select>
              </div>
              <div className={styles.fg}>
                <label className="label">Verbote / Don'ts</label>
                <textarea value={form.donts} onChange={e => set('donts', e.target.value)} placeholder="z.B. kein Rot, keine Ausrufezeichen" rows={2} />
              </div>
            </div>
          )}

          {/* TAB: Brand Kit */}
          {tab === 'brand' && (
            <div className={styles.fadeIn}>

              {/* Logos */}
              <div className={styles.brandSection}>
                <div className={styles.brandSectionHeader}>
                  <span className={styles.brandSectionTitle}>Logos</span>
                  <button className={styles.addBtn} onClick={() => logoInputRef.current.click()}>
                    + Hinzufügen
                  </button>
                  <input ref={logoInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleLogoUpload} />
                </div>
                {logos.length === 0 ? (
                  <div className={styles.logoEmpty} onClick={() => logoInputRef.current.click()}>
                    <span>+</span>
                    <span>Logo hochladen</span>
                  </div>
                ) : (
                  <div className={styles.logoGrid}>
                    {logos.map((l, i) => (
                      <div key={i} className={styles.logoItem}>
                        <img src={l.url} alt={l.name} className={styles.logoImg} />
                        <button className={styles.logoRemove} onClick={() => removeLogo(i)}>✕</button>
                        <span className={styles.logoName}>{l.name.slice(0, 20)}</span>
                      </div>
                    ))}
                    <div className={styles.logoAdd} onClick={() => logoInputRef.current.click()}>+</div>
                  </div>
                )}
              </div>

              {/* Farben */}
              <div className={styles.brandSection}>
                <div className={styles.brandSectionHeader}>
                  <span className={styles.brandSectionTitle}>Farben</span>
                  <button className={styles.addBtn} onClick={addColor}>+ Farbe</button>
                </div>
                <div className={styles.colorPalette}>
                  {colors.map((c, i) => (
                    <div key={i} className={styles.colorItem}>
                      <div className={styles.colorSwatch} style={{ background: c }}>
                        <input
                          type="color"
                          value={c}
                          onChange={e => updateColor(i, e.target.value)}
                          className={styles.colorPickerHidden}
                          title="Farbe ändern"
                        />
                        {colors.length > 1 && (
                          <button className={styles.colorRemove} onClick={() => removeColor(i)}>✕</button>
                        )}
                      </div>
                      <span className={styles.colorHex}>{c}</span>
                      {i === 0 && <span className={styles.colorRole}>Primär</span>}
                      {i === 1 && <span className={styles.colorRole}>Sekundär</span>}
                      {i === 2 && <span className={styles.colorRole}>Akzent</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Schriftarten */}
              <div className={styles.brandSection}>
                <div className={styles.brandSectionHeader}>
                  <span className={styles.brandSectionTitle}>Schriftarten</span>
                </div>
                <div className={styles.fontInput}>
                  <input
                    value={form.font}
                    onChange={e => set('font', e.target.value)}
                    placeholder="z.B. Helvetica Neue, Playfair Display"
                  />
                  {form.font && (
                    <div className={styles.fontPreview}>
                      <div className={styles.fontPreviewTitle} style={{ fontFamily: form.font }}>Titel</div>
                      <div className={styles.fontPreviewSub} style={{ fontFamily: form.font }}>Untertitel</div>
                      <div className={styles.fontPreviewBody} style={{ fontFamily: form.font }}>Fließtext</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Markenstimme */}
              <div className={styles.brandSection}>
                <div className={styles.brandSectionHeader}>
                  <span className={styles.brandSectionTitle}>Brand Voice</span>
                </div>
                <div className={styles.toneGrid}>
                  {TONES.map(t => (
                    <button key={t} className={`${styles.tone} ${form.tones.includes(t) ? styles.toneOn : ''}`} onClick={() => toggleTone(t)}>{t}</button>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.footer}>
          <button className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading && <span className="spinner" />}
            {isEdit ? 'Speichern' : 'Kunde anlegen'}
          </button>
        </div>
      </div>
    </div>
  )
}
