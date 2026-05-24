const { createHash } = require('crypto');

const cache = new Map();
const rateMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const e = rateMap.get(ip);
  if (!e || now - e[1] > 60000) { rateMap.set(ip, [1, now]); return false; }
  e[0]++; return e[0] > 15;
}

function imageHash(b64, lang) {
  return createHash('sha256').update(b64 + '|' + lang).digest('hex');
}

// Common medical abbreviations used in Indian prescriptions
// Using string-based regex construction to avoid confusion with escape sequences
const ABBREVIATION_PATTERNS = [
  ['\\bBD\\b', 'ig', 'twice daily'],
  ['\\bOD\\b', 'ig', 'once daily'],
  ['\\bTDS\\b', 'ig', 'three times daily'],
  ['\\bQDS\\b', 'ig', 'four times daily'],
  ['\\bHS\\b', 'ig', 'at bedtime'],
  ['\\bQHS\\b', 'ig', 'at bedtime'],
  ['\\bAC\\b', 'ig', 'before meals'],
  ['\\bPC\\b', 'ig', 'after meals'],
  ['\\bPRN\\b', 'ig', 'as needed'],
  ['\\bSTAT\\b', 'ig', 'immediately'],
  ['\\bPO\\b', 'ig', 'by mouth'],
  ['\\bIM\\b', 'ig', 'injection (intramuscular)'],
  ['\\bIV\\b', 'ig', 'intravenous'],
  ['\\bSOS\\b', 'ig', 'if necessary'],
  ['\\b1-0-1\\b', 'ig', 'one in morning, one at night'],
  ['\\b1-1-1\\b', 'ig', 'one three times daily'],
  ['\\b1-0-0\\b', 'ig', 'one in the morning'],
  ['\\b0-0-1\\b', 'ig', 'one at night'],
  ['\\b0-1-0\\b', 'ig', 'one in the afternoon'],
  ['\\b1-1-0\\b', 'ig', 'one morning and afternoon'],
  ['\\b1-0-1-0\\b', 'ig', 'one morning and night'],
  ['\\bMANE\\b', 'ig', 'in the morning'],
  ['\\bNOCTE\\b', 'ig', 'at night'],
  ['\\bTAB\\b', 'ig', 'tablet'],
  ['\\bCAP\\b', 'ig', 'capsule'],
  ['\\bSYR\\b', 'ig', 'syrup'],
  ['\\bINJ\\b', 'ig', 'injection'],
  ['\\bOINT\\b', 'ig', 'ointment'],
  ['\\bCREAM\\b', 'ig', 'cream'],
  ['\\bDROPS\\b', 'ig', 'drops'],
  ['\\bMG\\b', 'ig', 'mg'],
  ['\\bML\\b', 'ig', 'ml'],
];

const ABBREVIATIONS = ABBREVIATION_PATTERNS.map(function(p) {
  return [new RegExp(p[0], p[1]), p[2]];
});

function expandAbbreviations(text) {
  if (!text || typeof text !== 'string') return text || '';
  let result = text;
  for (const [pattern, replacement] of ABBREVIATIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function cleanMedicines(medicines) {
  if (!Array.isArray(medicines) || medicines.length === 0) {
    return [];
  }
  return medicines
    .filter(function(m) {
      if (!m || typeof m !== 'object') return false;
      const name = String(m.name || '').trim().toLowerCase();
      return name && name !== 'not found' && name !== 'unknown' && name !== 'none';
    })
    .map(function(m) {
      return {
        name:      expandAbbreviations(String(m.name      || '').trim()) || 'Not found',
        dosage:    expandAbbreviations(String(m.dosage    || '').trim()),
        frequency: expandAbbreviations(String(m.frequency || '').trim()),
        duration:  expandAbbreviations(String(m.duration  || '').trim()),
      };
    });
}

const SYSTEM = `You are a medical prescription reader for patients in India. Read the prescription image carefully and extract all information accurately.

Return ONLY a raw JSON object. NO markdown. NO backticks. NO text before or after.

Required JSON format:
{
  "patientName": "Patient name as written on prescription",
  "age": "Patient age if visible",
  "diagnosis": "Diagnosis in simple, plain words - translate all medical jargon",
  "medicines": [
    {
      "name": "Medicine name (brand or generic as written)",
      "dosage": "Dosage strength like 500mg, 250mg/5ml, etc.",
      "frequency": "How often to take - expand abbreviations into plain words (BD → twice daily, OD → once daily, TDS → three times daily, etc.)",
      "duration": "How many days to take (e.g., 7 days, 10 days, 1 month)"
    }
  ],
  "doctorName": "Doctor name if visible",
  "notes": "Any other instructions on the prescription"
}

Critical extraction rules:
- List EVERY medicine separately - do not combine or miss any
- For each medicine, extract: exact name, strength/dosage, frequency, and duration
- Expand ALL medical abbreviations to plain words
- Write diagnosis in simple words a 5th grader can understand
- For handwritten prescriptions, carefully read each character - compare medicine names against known Indian medicines if uncertain
- Include the dosage form (tablet, syrup, injection, capsule, cream) in the medicine name if visible
- If a field is truly not visible, use empty string "" - do NOT invent values
- If no prescription is detected: {"error":"No prescription found in this photo. Please retake with better lighting and ensure the prescription is fully visible."}

Common Indian prescription abbreviations you MUST expand:
- BD → twice daily, OD → once daily, TDS → three times daily
- QDS → four times daily, HS/QHS → at bedtime
- AC → before meals, PC → after meals
- PRN → as needed, STAT → immediately
- 1-0-1 → one in morning and night, 1-1-1 → one three times daily`;

function parseJSON(text) {
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try { return JSON.parse(cleaned); } catch (_) {}

  const braceMatch = cleaned.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch (_) {}
  }

  const noTrailComma = cleaned.replace(/,\s*([}\]])/g, '$1');
  try { return JSON.parse(noTrailComma); } catch (_) {}
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0].replace(/,\s*([}\]])/g, '$1')); } catch (_) {}
  }

  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests. Wait a moment.' });

  const body = req.body || {};
  const image = body.image;
  const targetLang = body.language || 'en';

  if (!image || String(image).length < 100) return res.status(400).json({ error: 'Image required.' });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not set.' });

  const key = imageHash(String(image), targetLang);
  if (cache.has(key)) {
    return res.status(200).json(Object.assign({}, cache.get(key), { cached: true }));
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 1600,
        temperature: 0.05,
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + String(image) } },
              { type: 'text', text: 'Read every detail on this prescription. Extract ALL medicines listed. Expand abbreviations to plain words.' }
            ]
          }
        ]
      })
    });

    const groqData = await groqRes.json();
    if (!groqRes.ok) {
      const errMsg = (groqData.error && groqData.error.message) || JSON.stringify(groqData);
      console.error('Groq vision error:', errMsg);
      return res.status(502).json({ error: 'AI vision error: ' + errMsg });
    }

    const raw = (groqData.choices && groqData.choices[0] && groqData.choices[0].message && groqData.choices[0].message.content) || '';
    if (!raw) return res.status(502).json({ error: 'No response from AI. Try again.' });

    const parsed = parseJSON(raw);
    if (!parsed) {
      console.error('JSON parse failed. Raw:', raw.slice(0, 300));
      return res.status(502).json({ error: 'Could not read prescription. Retake in better lighting with the full prescription visible.' });
    }
    if (parsed.error) return res.status(422).json({ error: parsed.error });

    const medicines = cleanMedicines(parsed.medicines);

    let result = {
      patientName: parsed.patientName ? expandAbbreviations(String(parsed.patientName).trim()) : 'Not visible',
      age:         parsed.age         ? String(parsed.age).trim() : 'Not visible',
      diagnosis:   parsed.diagnosis   ? expandAbbreviations(String(parsed.diagnosis).trim()) : 'Not found',
      medicines:   medicines,
      doctorName:  parsed.doctorName  ? expandAbbreviations(String(parsed.doctorName).trim()) : 'Not visible',
      notes:       parsed.notes       ? expandAbbreviations(String(parsed.notes).trim()) : '',
      confidence:  parsed.confidence  || 'medium',
      language:    'en',
      scanMode:    'prescription'
    };

    if (targetLang !== 'en') {
      const bhashiniKey    = process.env.BHASHINI_API_KEY;
      const bhashiniUserId = process.env.BHASHINI_USER_ID;
      if (bhashiniKey && bhashiniUserId) {
        try { result = await translateWithBhashini(result, targetLang, bhashiniKey, bhashiniUserId); result.language = targetLang; }
        catch (e) {
          console.warn('Bhashini translate failed, fallback to Groq:', e.message);
          try { result = await translateWithGroq(result, targetLang, groqKey); result.language = targetLang; }
          catch (e2) { console.error('Groq translate failed:', e2.message); }
        }
      } else {
        try { result = await translateWithGroq(result, targetLang, groqKey); result.language = targetLang; }
        catch (e) { console.error('Groq translate failed:', e.message); }
      }
    }

    cache.set(key, result);
    if (cache.size > 500) cache.delete(cache.keys().next().value);

    return res.status(200).json(result);

  } catch (err) {
    console.error('[MedEasy fatal]', err && err.message);
    return res.status(500).json({ error: 'Unexpected error: ' + (err && err.message || 'unknown') });
  }
};

async function translateWithBhashini(result, targetLang, apiKey, userId) {
  const fields = ['patientName', 'diagnosis', 'notes'];
  const texts  = fields.map(function(f) { return result[f]; });

  const pipelineRes = await fetch('https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'userID': userId, 'ulcaApiKey': apiKey },
    body: JSON.stringify({
      pipelineTasks: [{ taskType: 'translation', config: { language: { sourceLanguage: 'en', targetLanguage: targetLang } } }],
      pipelineRequestConfig: { pipelineId: 'ai4bharat/argos-translate-translate' }
    })
  });

  const pd = await pipelineRes.json();
  const serviceId = pd.pipelineResponseConfig[0].config[0].serviceId;
  const cbUrl     = pd.pipelineInferenceAPIEndPoint.callbackUrl;
  const inferKey  = pd.pipelineInferenceAPIEndPoint.inferenceApiKey.value;

  const trRes = await fetch(cbUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': inferKey },
    body: JSON.stringify({
      pipelineTasks: [{
        taskType: 'translation',
        config: { language: { sourceLanguage: 'en', targetLanguage: targetLang }, serviceId: serviceId },
        input: texts.map(function(t) { return { source: t }; })
      }],
      inputData: { input: texts.map(function(t) { return { source: t }; }) }
    })
  });

  const td = await trRes.json();
  const outputs = td.pipelineResponse[0].output;
  const translated = Object.assign({}, result);
  fields.forEach(function(f, i) { translated[f] = (outputs[i] && outputs[i].target) || result[f]; });
  return translated;
}

async function translateWithGroq(result, targetLang, groqKey) {
  const langNames = { hi:'Hindi', bn:'Bengali', ta:'Tamil', te:'Telugu', mr:'Marathi', gu:'Gujarati', kn:'Kannada', ml:'Malayalam', pa:'Punjabi', or:'Odia', ur:'Urdu' };
  const langName = langNames[targetLang] || targetLang;
  const prompt = 'Translate all JSON string values to ' + langName + '. Return ONLY raw JSON, same keys, no markdown, no backticks.\nInput: ' + JSON.stringify({ patientName: result.patientName, diagnosis: result.diagnosis, notes: result.notes });

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 600, temperature: 0.1, messages: [{ role: 'user', content: prompt }] })
  });

  const data = await res.json();
  const raw = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  if (!raw) throw new Error('Empty translation');
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const t = JSON.parse(match ? match[0] : cleaned);
  return Object.assign({}, result, {
    patientName: t.patientName || result.patientName,
    diagnosis: t.diagnosis || result.diagnosis,
    notes: t.notes || result.notes,
  });
}
