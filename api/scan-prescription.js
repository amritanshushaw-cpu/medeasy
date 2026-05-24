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

const SYSTEM = `You are a prescription reader for patients in India.
Look at this prescription image very carefully.
Extract ALL information including from bad handwriting and complex medical jargon.
Return ONLY a raw JSON object. NO markdown. NO backticks. NO text before or after.
Use exactly this format:
{"patientName":"patient name as written","age":"patient age if visible","diagnosis":"diagnosis in simple words, translate medical jargon","medicines":[{"name":"medicine name","dosage":"dosage amount","frequency":"how often to take","duration":"how long to take"}],"doctorName":"doctor name if visible","notes":"any other instructions on the prescription"}
Critical rules:
- Extract EVERY medicine on the prescription - do not miss any
- Write diagnosis in plain simple words (translate complex medical terms)
- If handwriting is unclear, make your best medical judgement based on context
- Include dosage strength (e.g. "500mg"), frequency (e.g. "twice daily"), and duration (e.g. "7 days") for each medicine
- If no prescription is visible: {"error":"No prescription found in this photo"}`;

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
        max_tokens: 1200,
        temperature: 0.05,
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + String(image) } },
              { type: 'text', text: 'Read this prescription carefully and return the JSON.' }
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

    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsed = null;
    try { parsed = JSON.parse(cleaned); } catch (_) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) { try { parsed = JSON.parse(match[0]); } catch (_) {} }
    }
    if (!parsed) {
      console.error('JSON parse failed. Raw:', cleaned.slice(0, 200));
      return res.status(502).json({ error: 'Could not read prescription. Retake in better lighting.' });
    }
    if (parsed.error) return res.status(422).json({ error: parsed.error });

    let result = {
      patientName: parsed.patientName || 'Not visible',
      age:         parsed.age         || 'Not visible',
      diagnosis:   parsed.diagnosis   || 'Not found',
      medicines:   parsed.medicines   || [{ name: 'Not found', dosage: '', frequency: '', duration: '' }],
      doctorName:  parsed.doctorName  || 'Not visible',
      notes:       parsed.notes       || '',
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
