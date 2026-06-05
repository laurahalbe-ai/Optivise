import { useState } from 'react'
import styles from './FeedbackTab.module.css'

const CATEGORIES = ['CI / Design', 'Copy / Texte', 'CRO / Conversion', 'Technik', 'Strategie', 'Sonstiges']

export default function FeedbackTab({ form, set }) {
  const [newInternal, setNewInternal] = useState({ category: 'CI / Design', text: '', date: new Date().toISOString().slice(0, 10) })
  const [newClient, setNewClient] = useState({ category: 'CI / Design', text: '', date: new Date().toISOString().slice(0, 10) })

  const internalFeedback = form.feedback_internal || []
  const clientFeedback = form.feedback_client || []

  function addFeedback(type) {
    const entry = type === 'internal' ? newInternal : newClient
    if (!entry.text.trim()) return
    const list = type === 'internal' ? [...internalFeedback] : [...clientFeedback]
    list.unshift({ ...entry, id: Date.now() })
    set(type === 'internal' ? 'feedback_internal' : 'feedback_client', list)
    if (type === 'internal') setNewInternal({ category: 'CI / Design', text: '', date: new Date().toISOString().slice(0, 10) })
    else setNewClient({ category: 'CI / Design', text: '', date: new Date().toISOString().slice(0, 10) })
  }

  function removeFeedback(type, id) {
    const key = type === 'internal' ? 'feedback_internal' : 'feedback_client'
    const list = (form[key] || []).filter(f => f.id !== id)
    set(key, list)
  }

  return (
    <div className={styles.wrap}>
      {/* Internal Feedback */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon} style={{ background: '#534AB720', color: '#7B6EF6' }}>👤</div>
          <div>
            <div className={styles.sectionTitle}>Internes Feedback</div>
            <div className={styles.sectionSub}>Notizen vom Teamleiter oder Designer</div>
          </div>
        </div>

        <div className={styles.addBox}>
          <div className={styles.addRow}>
            <select value={newInternal.category} onChange={e => setNewInternal(p => ({ ...p, category: e.target.value }))} className={styles.catSelect}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="date" value={newInternal.date} onChange={e => setNewInternal(p => ({ ...p, date: e.target.value }))} className={styles.dateInput} />
          </div>
          <textarea
            value={newInternal.text}
            onChange={e => setNewInternal(p => ({ ...p, text: e.target.value }))}
            placeholder="z.B. Kunde bevorzugt immer Bilder mit Personen. Keine abstrakten Grafiken."
            className={styles.addTextarea}
            rows={2}
          />
          <button className={styles.addBtn} onClick={() => addFeedback('internal')} disabled={!newInternal.text.trim()}>
            + Hinzufügen
          </button>
        </div>

        {internalFeedback.length > 0 && (
          <div className={styles.feedbackList}>
            {internalFeedback.map(f => (
              <div key={f.id} className={styles.feedbackItem}>
                <div className={styles.feedbackMeta}>
                  <span className={styles.feedbackCat}>{f.category}</span>
                  <span className={styles.feedbackDate}>{f.date}</span>
                  <button className={styles.removeBtn} onClick={() => removeFeedback('internal', f.id)}>✕</button>
                </div>
                <div className={styles.feedbackText}>{f.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Client Feedback */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon} style={{ background: '#34D39920', color: '#34D399' }}>🤝</div>
          <div>
            <div className={styles.sectionTitle}>Kunden-Feedback</div>
            <div className={styles.sectionSub}>Was der Kunde zurückgemeldet hat</div>
          </div>
        </div>

        <div className={styles.addBox}>
          <div className={styles.addRow}>
            <select value={newClient.category} onChange={e => setNewClient(p => ({ ...p, category: e.target.value }))} className={styles.catSelect}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="date" value={newClient.date} onChange={e => setNewClient(p => ({ ...p, date: e.target.value }))} className={styles.dateInput} />
          </div>
          <textarea
            value={newClient.text}
            onChange={e => setNewClient(p => ({ ...p, text: e.target.value }))}
            placeholder="z.B. Kunde möchte den CTA-Button immer in Orange. Mag keine Emojis in Headlines."
            className={styles.addTextarea}
            rows={2}
          />
          <button className={styles.addBtn} onClick={() => addFeedback('client')} disabled={!newClient.text.trim()}>
            + Hinzufügen
          </button>
        </div>

        {clientFeedback.length > 0 && (
          <div className={styles.feedbackList}>
            {clientFeedback.map(f => (
              <div key={f.id} className={styles.feedbackItem}>
                <div className={styles.feedbackMeta}>
                  <span className={styles.feedbackCat} style={{ background: '#34D39915', color: '#34D399' }}>{f.category}</span>
                  <span className={styles.feedbackDate}>{f.date}</span>
                  <button className={styles.removeBtn} onClick={() => removeFeedback('client', f.id)}>✕</button>
                </div>
                <div className={styles.feedbackText}>{f.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
