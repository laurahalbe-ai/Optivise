// Vercel Serverless Function – analyzes uploaded LP screenshots and creatives
export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '20mb'
    }
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ANTHROPIC_KEY = process.env.VITE_ANTHROPIC_API_KEY

  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: 'API Key fehlt – bitte VITE_ANTHROPIC_API_KEY in Vercel Environment Variables setzen.' })
  }

  let body = req.body
  if (!body) {
    return res.status(400).json({ error: 'Kein Body empfangen.' })
  }

  const { client, lpImages = [], crImages = [] } = body
  const c = client || {}
  const tones = (c.tones || []).join(', ') || 'n/a'

  try {
    const parts = []

    const prompt = `Du bist ein erfahrener QA-Experte für Landing Pages und Ad Creatives. Du gibst klares, direktes Feedback.

KUNDENPROFIL:
- Kunde: ${c.name || 'unbekannt'} | Branche: ${c.industry || 'n/a'}
- Zielgruppe: ${c.audience || 'n/a'} | LP-Ziel: ${c.goal || 'n/a'}
- USP: ${c.usp || 'n/a'}
- CI-Farben: Primär ${c.color_primary || 'n/a'}, Sekundär ${c.color_secondary || 'n/a'}, Akzent ${c.color_accent || 'n/a'}
- Schrift: ${c.font || 'n/a'} | Tonalität: ${tones}
- Verbote: ${c.donts || 'keine'}

${lpImages.length > 0 ? `LANDINGPAGE prüfen:
- Kein Onepage-Branding sichtbar
- CI-Farben korrekt (${c.color_primary}, ${c.color_secondary}, ${c.color_accent})
- Schrift "${c.font||'n/a'}" verwendet, max. 2 Schriftarten
- Kein Waisenkind, Headlines max. 2 Zeilen
- Hoher Farbkontrast, Abstände einheitlich
- CTA above the fold sichtbar
- Keine Platzhaltertexte
- Buttons einheitlich
- Impressum/Datenschutz sichtbar verlinkt` : ''}

${crImages.length > 0 ? `CREATIVES prüfen:
- Keine Rechtschreibfehler
- CI-Farben korrekt (${c.color_primary}, ${c.color_secondary}, ${c.color_accent})
- Schrift "${c.font||'n/a'}" verwendet, max. 2 Schriftarten
- Hoher Kontrast, Texte bündig ausgerichtet
- Overlays bis zu den Rändern
- Kein Waisenkind
- Format 1:1 oder 9:16
- Kein Play-Button, kein Maus-klickt-Button
- Schrift mind. 22px, gut lesbar
- Keine leeren Flächen
- Max. 3 Schriftgrößen` : ''}

CRO: CTA-Position, Social Proof, Trust-Elemente.
Copy: Markenstimme "${tones}", keine Platzhalter.

FREIGABE: max. 2 Warnungen, keine Fehler → approved: true
KEINE FREIGABE: bei Fehlern oder CI-Problemen → approved: false

Antworte NUR mit JSON:
{"approved":true/false,"verdict_headline":"<1 Satz>","verdict_reason":"<1-2 Sätze>","score":<1-100>,"issues":[{"type":"error|warning|cro|ci|copy","category":"LP|Creative|CI|CRO|Copy","title":"<Titel>","description":"<was du siehst>","fix":"<Maßnahme>"}]}`

    parts.push({ type: 'text', text: prompt })

    lpImages.forEach((img, i) => {
      parts.push({ type: 'text', text: `LP-Screenshot ${i+1}:` })
      parts.push({ type: 'image', source: { type: 'base64', media_type: img.type || 'image/jpeg', data: img.data } })
    })

    crImages.forEach((img, i) => {
      parts.push({ type: 'text', text: `Creative ${i+1}:` })
      parts.push({ type: 'image', source: { type: 'base64', media_type: img.type || 'image/jpeg', data: img.data } })
    })

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: parts }]
      })
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      return res.status(500).json({ error: `Claude API Fehler: ${claudeRes.status} – ${errText.slice(0, 200)}` })
    }

    const claudeData = await claudeRes.json()
    const txt = claudeData.content?.map(b => b.text || '').join('') || ''

    let parsed
    try {
      parsed = JSON.parse(txt.replace(/```json|```/g, '').trim())
    } catch {
      return res.status(200).json({
        success: false,
        error: 'JSON parse fehlgeschlagen',
        rawResponse: txt.slice(0, 500),
        result: null
      })
    }

    return res.status(200).json({ success: true, result: parsed })

  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unbekannter Fehler' })
  }
}
