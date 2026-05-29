/**
 * api/tts.js
 * Server-side proxy for Google Translate TTS.
 * - No API key needed
 * - Supports all 12 Indian languages
 * - Works on every device and browser
 * - Bypasses CORS restriction that blocks direct browser calls
 *
 * GET /api/tts?text=...&lang=hi
 * Returns audio/mpeg stream directly
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });

  const text = req.query.text;
  const lang = req.query.lang || 'hi';

  if (!text || !text.trim()) return res.status(400).json({ error: 'text param required' });

  // Split into chunks of max 200 chars (Google TTS limit per request)
  const chunks = splitText(String(text), 200);

  try {
    const audioBuffers = [];

    for (const chunk of chunks) {
      const url = 'https://translate.google.com/translate_tts'
        + '?ie=UTF-8'
        + '&q=' + encodeURIComponent(chunk)
        + '&tl=' + encodeURIComponent(lang)
        + '&client=tw-ob'
        + '&ttsspeed=0.85';

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer':    'https://translate.google.com/',
          'Accept':     'audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,*/*;q=0.5',
        }
      });

      if (!response.ok) {
        console.error('Google TTS error:', response.status, await response.text());
        return res.status(502).json({ error: 'TTS fetch failed: ' + response.status });
      }

      const buf = await response.arrayBuffer();
      audioBuffers.push(Buffer.from(buf));
    }

    const combined = Buffer.concat(audioBuffers);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', combined.length);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h
    return res.status(200).send(combined);

  } catch (err) {
    console.error('[TTS proxy error]', err && err.message);
    return res.status(500).json({ error: 'TTS error: ' + (err && err.message || 'unknown') });
  }
};

// Split text at sentence boundaries to stay under 200 char limit
// Avoids lookbehind assertions for broader Node.js compatibility
function splitText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  // Split on sentence-ending punctuation (Hindi danda, period, ! or ?)
  const sentences = text.split(/([।.!?])\s+/);
  let current = '';
  for (let i = 0; i < sentences.length; i++) {
    const part = sentences[i];
    const combined = current ? current + ' ' + part : part;
    if (combined.trim().length > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      // If a single sentence is longer than maxLen, hard-split it
      if (part.trim().length > maxLen) {
        let remaining = part.trim();
        while (remaining.length > maxLen) {
          chunks.push(remaining.slice(0, maxLen));
          remaining = remaining.slice(maxLen);
        }
        current = remaining;
      } else {
        current = part;
      }
    } else {
      current = combined.trim();
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text.slice(0, maxLen)];
}
