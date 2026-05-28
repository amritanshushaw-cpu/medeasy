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

const SYSTEM = `You are a medical report analyst for patients in India. Look at this medical report image very carefully.

Return ONLY a raw JSON object. NO markdown. NO backticks. NO text before or after.

Use exactly this format:
{
  "summary": "Plain-language summary of what the report shows. Write at 5th grade level. Short sentences. No medical jargon.",
  "metrics": [
    { "name": "Metric name like Hemoglobin", "value": "Value with units like 14.2 g/dL", "status": "normal" },
    { "name": "Metric name", "value": "Value", "status": "high" }
  ],
  "recommendations": [
    "First actionable recommendation in simple words",
    "Second recommendation"
  ]
}

Critical rules:
- Status must be exactly one of: "normal", "high", or "low"
- Extract ALL visible metrics from the report - do not miss any
- Write summary in simple words a 5th grader can understand
- Recommendations must be practical and actionable
- If no report is visible: {"error":"No medical report found in this photo. Please retake with better lighting and ensure the full report is visible."}
- If you cannot read values clearly, set status to "normal" and note uncertainty in summary
- For each metric shown in the report, create one entry in the metrics array
- Typical metrics may include: Hemoglobin, Blood Sugar/Glucose, Cholesterol (Total/HDL/LDL), Triglycerides, Creatinine, Uric Acid, Liver enzymes (SGOT/SGPT), WBC, RBC, Platelets, Thyroid (TSH/T3/T4), Vitamin D, Vitamin B12, Iron, etc.`;

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
              { type: 'text', text: 'Read this medical report carefully. Extract ALL metrics with their values and status. Provide a plain-language summary and actionable recommendations. Return JSON.' }
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
      return res.status(502).json({ error: 'Could not read report. Retake in better lighting with the full report visible.' });
    }
    if (parsed.error) return res.status(422).json({ error: parsed.error });

    let result = {
      summary: parsed.summary || 'No summary could be extracted.',
      keyMetrics: Array.isArray(parsed.metrics)
        ? parsed.metrics.map(function(m) {
            const s = String(m.status || 'normal').toLowerCase();
            return {
              name:   m.name   || 'Unknown',
              value:  m.value  || 'Not found',
              status: (s === 'high' || s === 'low') ? s : 'normal'
            };
          })
        : [],
      nextSteps: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      timestamp: Date.now(),
      language: 'en'
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
    console.error('[ReportAnalyzer fatal]', err && err.message);
    return res.status(500).json({ error: 'Unexpected error: ' + (err && err.message || 'unknown') });
  }
};

async function translateWithBhashini(result, targetLang, apiKey, userId) {
  const texts = [result.summary].concat(result.keyMetrics.map(function(m) { return m.name; })).concat(result.nextSteps);
  const fieldCount = 1 + result.keyMetrics.length + result.nextSteps.length;

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
  translated.summary = (outputs[0] && outputs[0].target) || result.summary;
  result.keyMetrics.forEach(function(m, i) {
    const translatedName = (outputs[1 + i] && outputs[1 + i].target) || m.name;
    translated.keyMetrics[i] = Object.assign({}, m, { name: translatedName });
  });
  const metricCount = result.keyMetrics.length;
  result.nextSteps.forEach(function(s, i) {
    const translatedStep = (outputs[1 + metricCount + i] && outputs[1 + metricCount + i].target) || s;
    translated.nextSteps[i] = translatedStep;
  });
  return translated;
}

async function translateWithGroq(result, targetLang, groqKey) {
  const langNames = { hi:'Hindi', bn:'Bengali', ta:'Tamil', te:'Telugu', mr:'Marathi', gu:'Gujarati', kn:'Kannada', ml:'Malayalam', pa:'Punjabi', or:'Odia', ur:'Urdu' };
  const langName = langNames[targetLang] || targetLang;
  const payload = {
    summary: result.summary,
    metrics: result.keyMetrics.map(function(m) { return { name: m.name, value: m.value, status: m.status }; }),
    recommendations: result.nextSteps
  };
  const prompt = 'Translate all JSON string values to ' + langName + '. Return ONLY raw JSON, same structure, no markdown, no backticks.\nInput: ' + JSON.stringify(payload);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 1200, temperature: 0.1, messages: [{ role: 'user', content: prompt }] })
  });

  const data = await res.json();
  const raw = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  if (!raw) throw new Error('Empty translation');
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const t = JSON.parse(match ? match[0] : cleaned);

  const translated = Object.assign({}, result);
  if (t.summary) translated.summary = t.summary;
  if (Array.isArray(t.metrics)) {
    translated.keyMetrics = result.keyMetrics.map(function(m, i) {
      const tm = t.metrics[i] || {};
      return Object.assign({}, m, { name: tm.name || m.name });
    });
  }
  if (Array.isArray(t.recommendations)) {
    translated.nextSteps = result.nextSteps.map(function(s, i) {
      return t.recommendations[i] || s;
    });
  }
  return translated;
}
