<div align="center">

# 🏥 MedEasy
### AI-Powered Medicine Label & Prescription Reader for Bharat

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-med-easy-six.vercel.app-F59E0B?style=for-the-badge)](https://med-easy-six.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-amritanshushaw--cpu%2Fmedeasy-181717?style=for-the-badge&logo=github)](https://github.com/amritanshushaw-cpu/medeasy)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**Scan any medicine label or prescription → Get plain-language explanation → Hear it spoken aloud in 12+ Indian languages**

*Built for the 850M+ people in India who struggle to read medicine labels and prescriptions*

---

</div>

## 🎯 Problem Statement

Every year, thousands of patients in India take wrong medicine doses or misunderstand prescriptions because they cannot read or understand medical text. Medicine labels are printed in English with dense jargon, and prescriptions often have illegible handwriting with complex medical terms — inaccessible to:

- Low-literacy patients in rural areas
- Elderly patients unfamiliar with English
- Patients prescribed medicines with complex dosage schedules
- Non-English speakers across 12+ Indian language groups

**MedEasy solves this with a single camera scan — for both medicine labels AND prescriptions.**

---

## ✨ Features

| Feature | Description |
|---|---|
| 📷 **Medicine Label Scan** | Point camera at any medicine label — tablet, syrup, injection |
| 📋 **Prescription Scan** | Scan handwritten/printed prescriptions — decodes medical jargon & bad handwriting |
| 📊 **Report Analysis** | Upload medical reports (blood tests, lipid profiles, etc.) for AI-powered analysis with metric extraction |
| 🧠 **AI Vision OCR** | Llama 4 Scout reads text even on curved/glossy surfaces and messy handwriting |
| 📝 **Plain Language Output** | Rewrites complex dosage & diagnosis at 3rd grade reading level |
| 🌐 **12 Indian Languages** | Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, Urdu, English |
| 🔊 **Local Language Audio** | Google TTS proxy delivers native-quality audio in all 12 languages |
| 🗣️ **Bhashini TTS** | Optional official Indian government AI voices via Bhashini ULCA |
| 📋 **Scan History** | Last 20 scans saved locally with thumbnails |
| 📤 **Share Results** | Native share sheet or clipboard copy |
| ⚡ **Smart Caching** | SHA-256 image hash prevents duplicate API calls (scan + report both cached) |
| 📱 **PWA** | Installable on Android/iOS home screen, works offline (shell) |
| ♿ **Accessible** | WCAG AA contrast, ARIA labels, 56px+ touch targets, Atkinson Hyperlegible font |

---

## 🏗 System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser / PWA)                         │
│                                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────────┐   │
│  │  IdleScreen  │   │ CameraScreen │   │   ResultsScreen          │   │
│  │  Lang Select │──▶│ getUserMedia │──▶│  Label or Prescription   │   │
│  │  3 Scan Modes│   │ Capture JPEG │   │  Result Cards + TTS      │   │
│  │  + Report    │   └──────┬───────┘   │  Share Button            │   │
│  │  History     │          │           └──────────────────────────┘   │
│  └──────┬───────┘   ┌──────▼───────┐   ┌──────────────────────────┐   │
│         │           │  useCamera   │   │  ReportAnalyzer          │   │
│         │           │  Resize 1024 │   │  Summary + Metrics       │   │
│         │           │  65% JPEG    │   │  Next Steps + Thumbnail  │   │
│         │           │  SHA-256 key │   └────────────┬─────────────┘   │
│         │           └──────┬───────┘                │                   │
│         │                  │                        │                   │
│         │  POST /api/scan or /api/scan-prescription │                   │
│         │  ────────────────┘                        │                   │
│         │  POST /api/scan-report (via upload)       │                   │
│         └───────────────────────────────────────────┘                   │
└────────────────────────────┼──────────────────────────────────────────┘
                             │
                             ▼ HTTPS
┌──────────────────────────────────────────────────────────────────────────┐
│                     VERCEL SERVERLESS FUNCTIONS                          │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  api/scan.js  (Medicine Labels)                                │   │
│  │  api/scan-prescription.js  (Prescriptions)                     │   │
│  │  api/scan-report.js  (Medical Report Analysis)                 │   │
│  │                                                                │   │
│  │  1. Rate limit check (15 req/min per IP)                      │   │
│  │  2. SHA-256 full-image hash → in-process cache lookup          │   │
│  │  3. Groq Vision API call (Llama 4 Scout)                      │   │
│  │     ┌──────────────────────────────────────────────────┐     │   │
│  │     │  LABEL PROMPT:                                    │     │   │
│  │     │  → { drugName, dosage, sideEffects, warnings }    │     │   │
│  │     │                                                    │     │   │
│  │     │  PRESCRIPTION PROMPT:                              │     │   │
│  │     │  → { patientName, age, diagnosis, medicines[],    │     │   │
│  │     │      doctorName, notes }                           │     │   │
│  │     │                                                    │     │   │
│  │     │  REPORT PROMPT:                                    │     │   │
│  │     │  → { summary, keyMetrics[], nextSteps[] }         │     │   │
│  │     └──────────────────────────────────────────────────┘     │   │
│  │  4. If lang ≠ en → Bhashini translate OR Groq translate      │   │
│  │  5. Cache result, return JSON                                 │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  api/tts.js                                                   │   │
│  │  GET /api/tts?text=दवाई&lang=hi → Google TTS proxy           │   │
│  │  Returns audio/mpeg stream, 24hr cache header                  │   │
│  └────────────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
              ┌────────────┼────────────────┐
              ▼            ▼                ▼
    ┌──────────────┐  ┌──────────┐  ┌──────────────────┐
    │  Groq API    │  │ Bhashini │  │  Google TTS      │
    │  Llama 4     │  │  ULCA    │  │  Translate       │
    │  Scout       │  │  API     │  │  (proxy)         │
    │  (vision)    │  │ (text    │  │  (audio          │
    │              │  │  trans.) │  │   stream)        │
    └──────────────┘  └──────────┘  └──────────────────┘
```

---

## 🔄 Request Lifecycle

### Medicine Label Scan
```
User taps "Scan Medicine Label" 
    → Camera → Capture → POST /api/scan
    → Groq Vision (label prompt) → Translate → Results
    → Auto TTS Readout
```

### Prescription Scan
```
User taps "Scan Prescription" 
    → Camera → Capture → POST /api/scan-prescription
    → Groq Vision (prescription prompt) → Extract structured data → Translate
    → Results (Patient, Diagnosis, Medicines, Doctor, Notes)
    → Auto TTS Readout
```

### Medical Report Analysis
```
User taps "Analyze Report" 
    → File picker → Drag & drop or browse for report (PDF/PNG/JPEG)
    → File read as base64 → SHA-256 cache check → POST /api/scan-report
    → Groq Vision (report prompt) → Extract metrics, summary, recommendations
    → Results (Plain-language summary, Key Metrics with status, Next Steps)
```

---

## 🌐 APIs & Integrations

### 1. Groq API — Vision + Translation
| Property | Value |
|---|---|
| Model | `meta-llama/llama-4-scout-17b-16e-instruct` |
| Purpose | OCR + plain-language extraction in single call |
| Fallback model | `llama-3.3-70b-versatile` (text translation only) |
| Free tier | 14,400 req/day |
| Endpoint | `https://api.groq.com/openai/v1/chat/completions` |
| Auth | Bearer token via `GROQ_API_KEY` env var |

### 2. Bhashini ULCA API — Official Indian Language Translation
| Property | Value |
|---|---|
| Provider | Ministry of Electronics & IT, Government of India |
| Purpose | Text translation (en → 11 Indian languages) |
| Registration | [bhashini.gov.in/ulca/user/register](https://bhashini.gov.in/ulca/user/register) |
| Cost | Free |

### 3. Google Translate TTS — Guaranteed Audio
| Property | Value |
|---|---|
| Purpose | Native-quality audio in all 12 languages |
| Auth | None (proxied server-side to bypass CORS) |

### 4. Web Speech API — Browser TTS Fallback

### 5. Report Analysis API — `/api/scan-report`
| Property | Value |
|---|---|
| Model | `meta-llama/llama-4-scout-17b-16e-instruct` |
| Purpose | Vision-based medical report analysis (blood tests, lipid profiles, etc.) |
| Input | `{ image: "<base64>" }` — JPEG/PNG of the report |
| Output | `{ summary, keyMetrics: [{name, value, status}], nextSteps: [string] }` |
| Caching | SHA-256 image hash → in-process LRU cache (500 entries) |
| Rate limit | 15 requests/min per IP |

---

## 🗣️ Audio Strategy (3-Layer Fallback)

```
Layer 1: Google TTS Proxy (/api/tts)
    ✓ Native Google voices for all 12 Indian languages
    ✓ No API key needed
    ↓ (if fails)

Layer 2: Web Speech API with Indian BCP-47 codes
    ✓ hi-IN, ta-IN, bn-IN, te-IN etc.
    ✓ Uses device's built-in voices
    ↓ (if no Indian voice installed)

Layer 3: Web Speech API in English
    ✓ Always available universal fallback
```

---

## 🌍 Supported Languages

| Language | Code | BCP-47 |
|---|---|---|
| English | `en` | `en-US` |
| Hindi | `hi` | `hi-IN` |
| Bengali | `bn` | `bn-IN` |
| Tamil | `ta` | `ta-IN` |
| Telugu | `te` | `te-IN` |
| Marathi | `mr` | `mr-IN` |
| Gujarati | `gu` | `gu-IN` |
| Kannada | `kn` | `kn-IN` |
| Malayalam | `ml` | `ml-IN` |
| Punjabi | `pa` | `pa-IN` |
| Odia | `or` | `or-IN` |
| Urdu | `ur` | `ur-IN` |

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool + dev server |
| vite-plugin-pwa | PWA manifest + service worker |
| Web Speech API | Browser TTS fallback |
| getUserMedia API | Camera capture |
| SubtleCrypto SHA-256 | Cache key generation |

### Backend (Vercel Serverless)
| Technology | Purpose |
|---|---|
| Node.js | Serverless function runtime |
| Vercel Functions | Serverless deployment |
| In-process Map (LRU 500) | Server-side result cache |

### AI & APIs
| Service | Purpose | Cost |
|---|---|---|
| Groq (Llama 4 Scout) | Vision OCR + plain-language extraction + report analysis | Free (14,400/day) |
| Groq (Llama 3.3 70B) | Translation fallback | Free |
| Bhashini ULCA | Official Indian translation + TTS | Free (Government) |
| Google Translate TTS | Audio proxy | Free |

### Report Analysis Components
| Component | Purpose |
|---|---|
| `api/scan-report.js` | Serverless function: Groq vision → metric extraction → JSON response |
| `ReportUploadScreen.tsx` | Drag & drop file upload with type/size validation |
| `ReportProcessingScreen.tsx` | Animated loading with step indicators |
| `ReportAnalyzer.tsx` | Results display: summary card, metric table with status badges, next steps |
| `reportAnalyzer.ts` | Client API wrapper with SHA-256 cache dedup in `App.tsx` |

---

## 📁 Project Structure

```
med-easy/
├── api/
│   ├── scan.js                  # Vision OCR + translation (medicine labels)
│   ├── scan-prescription.js     # Vision OCR + translation (prescriptions)
│   ├── scan-report.js           # Vision OCR + analysis (medical reports)  ← NEW
│   └── tts.js                   # Google TTS audio proxy
├── public/
│   ├── manifest.json            # PWA manifest
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── components/
│   │   ├── IdleScreen.tsx       # Home screen + 2 scan modes + language selector
│   │   ├── CameraScreen.tsx     # Camera viewfinder + scan frame
│   │   ├── ProcessingScreen.tsx # Loading with mode-aware steps
│   │   ├── ResultsScreen.tsx    # Label OR Prescription results + TTS + share
│   │   ├── HistoryScreen.tsx    # Past scans (both types) with thumbnails
│   │   ├── ErrorScreen.tsx      # Error with smart tips
│   │   ├── ReportUploadScreen.tsx    # Drag & drop report upload with validation  ← NEW
│   │   ├── ReportProcessingScreen.tsx # Animated analysis progress screen        ← NEW
│   │   └── ReportAnalyzer.tsx    # Report results: summary, metrics, next steps  ← NEW
│   ├── hooks/
│   │   ├── useCamera.ts         # Camera stream + resize + capture
│   │   └── useTTS.ts            # 3-layer TTS with Google proxy
│   ├── styles/
│   │   └── global.css           # Design tokens, animations, components
│   ├── App.tsx                  # State machine with ScanMode support
│   ├── main.tsx                 # React entry point
│   └── types.ts                 # TypeScript types + ScanResult + PrescriptionResult
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vercel.json                  # Serverless function + routing config
└── vite.config.ts
```

---

## 🚀 Local Setup

### Prerequisites
- Node.js 18+
- Free Groq API key from [console.groq.com](https://console.groq.com)

### Steps
```bash
# 1. Clone
git clone https://github.com/amritanshushaw-cpu/medeasy.git
cd medeasy

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Add your GROQ_API_KEY to .env

# 4. Run (must use vercel dev to run api/ functions locally)
npm install -g vercel
vercel dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 Environment Variables

| Variable | Required | Description | Get it |
|---|---|---|---|
| `GROQ_API_KEY` | ✅ | Groq API key for vision + translation | [console.groq.com](https://console.groq.com) |
| `BHASHINI_API_KEY` | Optional | Bhashini ULCA key (better translation) | [bhashini.gov.in](https://bhashini.gov.in/ulca/user/register) |
| `BHASHINI_USER_ID` | Optional | Bhashini user ID | Same as above |

---

## 📱 User Manual

### Step 1 — Open the App
Visit `mediscan-six.vercel.app` on any browser. On Android/iOS tap **Add to Home Screen** to install an app.

### Step 2 — Select Your Language
Scroll the language bar at the bottom of the home screen. Tap your preferred language.

### Step 3 — Choose Action
Three options on the home screen:
- **💊 Scan Medicine Label** — for medicine bottles, strips, syrups, etc.
- **📋 Scan Prescription** — for handwritten/printed prescriptions from doctors
- **📊 Analyze Report** — for medical reports (blood tests, lipid profiles, etc.)

### Step 4 — Scan
Tap your chosen option. Hold the item inside the gold frame. Tap the shutter button.

### Step 5 — Get Results

**Medicine Label Results:**
- 💊 **Medicine Name**
- 📋 **How to Take It**
- ⚡ **Side Effects**
- ⚠️ **Warnings**

**Prescription Results:**
- 👤 **Patient Info** (name, age)
- 🩺 **Diagnosis** in simple words
- 💊 **Prescribed Medicines** (name, dosage, frequency, duration per medicine)
- 👨‍⚕️ **Doctor Name**
- 📝 **Additional Notes**

The app **automatically reads the results aloud** in your selected language.

### Step 6 — Analyze Medical Reports
Tap the **📊 Analyze Report** button on the home screen.

Upload a medical report (blood test, lipid profile, thyroid panel, etc.) by dragging & dropping or browsing files. Supported formats: PDF, PNG, JPEG, WebP (max 20MB).

**Report Analysis Results:**
- 📋 **Plain-Language Summary** — what the report says in simple words
- 📊 **Key Metrics** — each metric with value and status badge (Normal / High / Low)
- ✅ **Recommended Actions** — actionable next steps based on the results

Results are **SHA-256 cached** so re-uploading the same report returns instantly.

---

## ♿ Accessibility

| Feature | Implementation |
|---|---|
| Font | Atkinson Hyperlegible — designed for low-vision readers |
| Contrast | WCAG AA compliant (4.5:1 minimum ratio) |
| Touch targets | All buttons minimum 56px tall |
| ARIA | Full `aria-label` on all interactive elements |
| Live regions | `aria-live` announces results to screen readers |
| Keyboard | Fully navigable without mouse |
| Auto TTS | Results read aloud automatically on render |

---

## 🔒 Privacy & Security

- 📸 **Photos are never stored** — images are processed in memory and discarded
- 🔑 **API keys are server-side only** — never exposed to the browser
- 🚫 **No user accounts** — no sign-up, no tracking
- ⚡ **Results cached by image hash** — your scan data stays in-memory only
- 🌐 **HTTPS only** — all communication encrypted

---

## 🤝 Contributors

| Name | Role | GitHub |
|---|---|---|
| **Amritanshu Shaw** | Full Stack Developer — Architecture, Backend, API, Deployment | [@amritanshushaw-cpu](https://github.com/amritanshushaw-cpu) |
| **Shrinivas Ghosh** | AI & Integration — Groq Pipeline, Bhashini API, Language Support | [@devnivas](https://github.com/devnivas) |
| **Saptak Sarathi Chakraborty** | Product & Design — UX, Accessibility, User Research | [@saptakgg](https://github.com/saptakgg) |
| **Ritam Karmakar** | Full Stack Developer — Frontend, Backend | [@ritam07karmakar-prog](https://github.com/ritam07karmakar-prog) |

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

<div align="center">

Built with ❤️ for Bharat 🇮🇳

**MedEasy** — Making medicine & prescriptions accessible to every Indian

[med-easy-six.vercel.app](https://med-easy-six.vercel.app)

</div>
