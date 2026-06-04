import { useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './ClientModal.module.css'

const TONES = ['Professionell','Freundlich','Mutig','Vertrauensvoll','Verspielt','Minimalistisch','Emotional','Modern','Luxuriös']

export default function ClientModal({ client, onClose, onSaved }) {
  const isEdit = !!client
  const [form, setForm] = useState({
    name: client?.name || '',
    industry: client?.industry || '',
    audience: client?.audience || '',
    usp: client?.usp || '',
    goal: client?.goal || '',
    color_primary: client?.color_primary || '#7B6EF6',
    color_secondary: client?.color_secondary || '#34D399',
    color_accent: client?.color_accent || '#FBBF24',
    font: client?.font || '',
    tones: client?.tones || [],
    donts: client?.donts || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }
  function toggleTone(t) {
    set('tones', form.tones.includes(t) ? form.tones.filter(x => x !== t) : [...form.tones, t])
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Kundenname ist Pflicht.'); return }
    setLoading(true); setError('')
    const payload = { ...form }
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
          <h2 className={styles.title}>{isEdit ? 'Kunde bearbeiten' : 'Neuer Kunde'}</h2>
          <button className="btn btn-ghost" style={{padding:'4px 8px'}} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Kundendaten</div>
            <div className={styles.row2}>
              <div>
                <label className="label">Name *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="z.B. Müller GmbH" />
              </div>
              <div>
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
            <div style={{marginTop:10}}>
              <label className="label">Zielgruppe</label>
              <input value={form.audience} onChange={e => set('audience', e.target.value)} placeholder="z.B. Frauen 25–45, urban, kauffreudig" />
            </div>
            <div style={{marginTop:10}}>
              <label className="label">USP / Kernbotschaft</label>
              <textarea value={form.usp} onChange={e => set('usp', e.target.value)} placeholder="Was macht den Kunden einzigartig?" rows={2} />
            </div>
            <div style={{marginTop:10}}>
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
          </div>

          <div className={styles.divider} />

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Corporate Identity</div>
            <div className={styles.colorRow}>
              {[
                { key:'color_primary', label:'Primärfarbe' },
                { key:'color_secondary', label:'Sekundärfarbe' },
                { key:'color_accent', label:'Akzentfarbe' },
              ].map(({ key, label }) => (
                <div key={key} className={styles.colorField}>
                  <label className="label">{label}</label>
                  <div className={styles.colorInput}>
                    <input type="color" value={form[key]} onChange={e => set(key, e.target.value)} className={styles.colorPicker} />
                    <span className={styles.colorHex}>{form[key]}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{marginTop:10}}>
              <label className="label">Hauptschrift</label>
              <input value={form.font} onChange={e => set('font', e.target.value)} placeholder="z.B. Helvetica Neue" />
            </div>
            <div style={{marginTop:10}}>
              <label className="label">Markenstimme</label>
              <div className={styles.toneGrid}>
                {TONES.map(t => (
                  <button key={t} className={`${styles.tone} ${form.tones.includes(t) ? styles.toneOn : ''}`} onClick={() => toggleTone(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div style={{marginTop:10}}>
              <label className="label">Verbote / Don'ts</label>
              <textarea value={form.donts} onChange={e => set('donts', e.target.value)} placeholder="z.B. kein Rot, keine Ausrufezeichen" rows={2} />
            </div>
          </div>
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
