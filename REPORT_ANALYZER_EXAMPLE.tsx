/**
 * EXAMPLE: How to integrate ReportAnalyzer into your existing App.tsx
 * 
 * This file shows the minimal changes needed to add the Report Analyzer
 * screen to your existing application.
 */

import React, { useCallback, useState } from 'react';
import { useCamera } from './hooks/useCamera';
import { useTTS } from './hooks/useTTS';
import { IdleScreen } from './components/IdleScreen';
import { CameraScreen } from './components/CameraScreen';
import { ProcessingScreen } from './components/ProcessingScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { ErrorScreen } from './components/ErrorScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { ReportAnalyzer } from './components/ReportAnalyzer'; // ← NEW IMPORT
import type {
  Screen,
  ScanResult,
  PrescriptionResult,
  ResultData,
  HistoryItem,
  Language,
  ScanMode,
} from './types';
import { LANGUAGES } from './types';
import './styles/global.css';

// ← UPDATE THE Screen TYPE TO INCLUDE 'reportAnalyzer'
// export type Screen = 'idle' | 'camera' | 'processing' | 'results' | 'error' | 'reportAnalyzer';

async function computeKey(b64: string, lang: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(b64 + '|' + lang);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

const scanCache = new Map<string, ResultData>();

const AppWithReportAnalyzer: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('idle');
  const [result, setResult] = useState<ResultData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedLang, setSelectedLang] = useState<Language>(LANGUAGES[0]);
  const [thumbnail, setThumbnail] = useState<string | undefined>();
  const [scanMode, setScanMode] = useState<ScanMode>('label');

  const camera = useCamera();
  const tts = useTTS();

  const handleStart = useCallback(
    async (mode: ScanMode) => {
      setScanMode(mode);
      try {
        await camera.startStream();
        setScreen('camera');
      } catch {
        setErrorMsg('Camera access denied. Please allow camera permission.');
        setScreen('error');
      }
    },
    [camera]
  );

  const handleCapture = useCallback(async () => {
    const b64 = camera.captureBase64();
    camera.stopStream();
    if (!b64) {
      setErrorMsg('Could not capture image. Please try again.');
      setScreen('error');
      return;
    }

    const thumb = b64.length > 60000 ? b64.slice(0, 60000) : b64;
    setScreen('processing');
    tts.stop();

    // ... rest of your existing logic ...
  }, [camera, tts]);

  const handleGoBack = useCallback(() => {
    setScreen('idle');
    setResult(null);
    setErrorMsg('');
  }, []);

  // ← ADD NEW HANDLER FOR REPORT ANALYZER
  const handleOpenReportAnalyzer = useCallback(() => {
    setScreen('reportAnalyzer' as Screen);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Existing screens */}
      {screen === 'idle' && (
        <>
          <IdleScreen
            selectedLang={selectedLang}
            onSelectLang={setSelectedLang}
            onStart={handleStart}
          />
          {/* ← ADD BUTTON TO NAVIGATE TO REPORT ANALYZER */}
          <div className="flex justify-center p-4">
            <button
              onClick={handleOpenReportAnalyzer}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow duration-200 font-semibold"
            >
              📊 Analyze Medical Report
            </button>
          </div>
        </>
      )}

      {screen === 'camera' && (
        <CameraScreen
          onCapture={handleCapture}
          onCancel={handleGoBack}
        />
      )}

      {screen === 'processing' && <ProcessingScreen />}

      {screen === 'results' && result && (
        <ResultsScreen
          result={result}
          history={history}
          selectedLang={selectedLang}
          thumbnail={thumbnail}
          onViewHistory={() => setScreen('history')}
          onGoBack={handleGoBack}
        />
      )}

      {screen === 'error' && (
        <ErrorScreen errorMsg={errorMsg} onGoBack={handleGoBack} />
      )}

      {screen === 'history' && (
        <HistoryScreen
          history={history}
          onGoBack={handleGoBack}
          onSelectItem={(item) => {
            setResult(item.result);
            setThumbnail(item.thumbnail);
            setScreen('results');
          }}
        />
      )}

      {/* ← NEW REPORT ANALYZER SCREEN */}
      {screen === 'reportAnalyzer' && <ReportAnalyzer />}
    </div>
  );
};

export default AppWithReportAnalyzer;

/**
 * STEP-BY-STEP INTEGRATION:
 * 
 * 1. Update your types.ts:
 *    Change: export type Screen = 'idle' | 'camera' | 'processing' | 'results' | 'error' | 'history';
 *    To:     export type Screen = 'idle' | 'camera' | 'processing' | 'results' | 'error' | 'history' | 'reportAnalyzer';
 * 
 * 2. Add import in App.tsx:
 *    import { ReportAnalyzer } from './components/ReportAnalyzer';
 * 
 * 3. Add the ReportAnalyzer rendering (see screen === 'reportAnalyzer' above)
 * 
 * 4. Add navigation button from idle screen to show:
 *    <button onClick={() => setScreen('reportAnalyzer')}>
 *      📊 Analyze Medical Report
 *    </button>
 * 
 * 5. Optional: Add back button in ReportAnalyzer by updating the component
 *    and passing setScreen as a prop, or use a router if you prefer.
 * 
 * That's it! The Report Analyzer is now fully integrated.
 */
