export const config = {
  maxDuration: 60,
  api: { bodyParser: { sizeLimit: '20mb' } }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ANTHROPIC_KEY = process.env.VITE_ANTHROPIC_API_KEY
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'API Key fehlt in Vercel Environment Variables.' })

  const { client, lpImages = [], crImages = [] } = req.body || {}
  const c = client || {}
  const tones = (c.tones || []).join(', ') || 'n/a'

  const prompt = `Du bist ein Senior Marketing- und Conversion-Experte. Analysiere die hochgeladenen Materialien und gib direktes, konkretes Feedback.

KUNDENPROFIL:
- Kunde: ${c.name || 'unbekannt'} | Branche: ${c.industry || 'n/a'}
- Zielgruppe: ${c.audience || 'n/a'} | LP-Ziel: ${c.goal || 'n/a'}
- USP: ${c.usp || 'n/a'}
- CI-Farben: Primär ${c.color_primary || 'n/a'}, Sekundär ${c.color_secondary || 'n/a'}, Akzent ${c.color_accent || 'n/a'}
- Schrift: ${c.font || 'n/a'} | Tonalität: ${tones}
- Verbote: ${c.donts || 'keine'}

${lpImages.length > 0 ? `LANDING PAGE CHECKLISTE:
□ Onepage-Branding deaktiviert | □ Kein Platzhaltertext | □ CI-Farben korrekt (${c.color_primary}, ${c.color_secondary}, ${c.color_accent})
□ Schrift "${c.font||'n/a'}" | □ Max. 2 Schriftarten | □ Zeilenabstand 1-1,5 | □ Hoher Kontrast
□ Kein Waisenkind | □ Headlines max. 2 Zeilen | □ CTA above fold | □ Buttons einheitlich
□ Abstände einheitlich | □ Impressum & Datenschutz | □ URL ohne Funnel-Begriffe` : ''}

${crImages.length > 0 ? `CREATIVES CHECKLISTE:
□ Keine Rechtschreibfehler | □ CI-Farben korrekt (${c.color_primary}, ${c.color_secondary}, ${c.color_accent})
□ Schrift "${c.font||'n/a'}" | □ Max. 2 Schriftarten | □ Max. 3 Schriftgrößen | □ Schrift mind. 22px
□ Hoher Kontrast | □ Texte bündig/zentriert | □ Overlays bis zum Rand | □ Kein Waisenkind
□ Format 1:1 oder 9:16 | □ Kein Play-Button | □ Keine leeren Flächen | □ Schrift lesbar` : ''}

CONVERSION-ANALYSE (immer prüfen):
- Ist die Hauptbotschaft in 3 Sekunden klar?
- CTA stark und prominent?
- Trust-Signale vorhanden?
- Headline überzeugend für "${c.audience || 'n/a'}"?
- Emotionaler Ton passend zu "${tones}"?

FREIGABE: approved=true nur bei max. 2 Warnungen und keinen Fehlern.

Antworte NUR mit JSON:
{"approved":true,"verdict_headline":"1 klarer Satz","verdict_reason":"1-2 Sätze","score":85,"issues":[{"type":"error|warning|cro|ci|copy","category":"LP|Creative|CI|CRO|Copy","title":"Titel","description":"was du konkret siehst","fix":"konkrete Maßnahme"}]}`

  try {
    const parts = [{ type: 'text', text: prompt }]
    lpImages.forEach((img, i) => {
      parts.push({ type: 'text', text: `Landing Page ${i + 1}:` })
      parts.push({ type: 'image', source: { type: 'base64', media_type: img.type || 'image/jpeg', data: img.data } })
    })
    crImages.forEach((img, i) => {
      parts.push({ type: 'text', text: `Creative ${i + 1}:` })
      parts.push({ type: 'image', source: { type: 'base64', media_type: img.type || 'image/jpeg', data: img.data } })
    })

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2000, messages: [{ role: 'user', content: parts }] })
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      return res.status(500).json({ error: `Claude Fehler: ${claudeRes.status} – ${err.slice(0, 300)}` })
    }

    const data = await claudeRes.json()
    const txt = data.content?.map(b => b.text || '').join('') || ''
    let parsed
    try { parsed = JSON.parse(txt.replace(/```json|```/g, '').trim()) } catch { parsed = null }

    return res.status(200).json({ success: true, result: parsed, rawText: parsed ? undefined : txt.slice(0, 500) })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
