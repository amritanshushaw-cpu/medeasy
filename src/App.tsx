import React, { useCallback, useState } from 'react';
import { useCamera }        from './hooks/useCamera';
import { useTTS }           from './hooks/useTTS';
import { IdleScreen }       from './components/IdleScreen';
import { CameraScreen }     from './components/CameraScreen';
import { ProcessingScreen } from './components/ProcessingScreen';
import { ResultsScreen }    from './components/ResultsScreen';
import { ErrorScreen }      from './components/ErrorScreen';
import { HistoryScreen }    from './components/HistoryScreen';
import { ReportUploadScreen } from './components/ReportUploadScreen';
import { ReportProcessingScreen } from './components/ReportProcessingScreen';
import { ReportAnalyzer }   from './components/ReportAnalyzer';
import type { Screen, ScanResult, PrescriptionResult, ResultData, HistoryItem, Language, ScanMode, AnalysisResult } from './types';
import { LANGUAGES } from './types';
import { analyzeReport } from './api/reportAnalyzer';
import './styles/global.css';

async function computeKey(b64: string, lang: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(b64 + '|' + lang);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

const scanCache = new Map<string, ResultData>();
const reportCache = new Map<string, AnalysisResult>();

const App: React.FC = () => {
  const [screen,       setScreen]       = useState<Screen>('idle');
  const [result,       setResult]       = useState<ResultData | null>(null);
  const [errorMsg,     setErrorMsg]     = useState('');
  const [history,      setHistory]      = useState<HistoryItem[]>([]);
  const [selectedLang, setSelectedLang] = useState<Language>(LANGUAGES[0]);
  const [thumbnail,    setThumbnail]    = useState<string | undefined>();
  const [scanMode,     setScanMode]     = useState<ScanMode>('label');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [reportThumbnail, setReportThumbnail] = useState<string | undefined>();
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const camera = useCamera();
  const tts    = useTTS();

  const handleStart = useCallback(async (mode: ScanMode) => {
    setScanMode(mode);
    if (mode === 'report') {
      setAnalysisResult(null); setReportThumbnail(undefined); setUploadedFileName('');
    }
    try { await camera.startStream(); setScreen('camera'); }
    catch { setErrorMsg('Camera access denied. Please allow camera permission.'); setScreen('error'); }
  }, [camera]);

  const handleCapture = useCallback(async () => {
    const b64 = camera.captureBase64();
    camera.stopStream();
    if (!b64) { setErrorMsg('Could not capture image. Please try again.'); setScreen('error'); return; }

    const thumb = b64.length > 60000 ? b64.slice(0, 60000) : b64;
    tts.stop();

    if (scanMode === 'report') {
      setUploadedFileName('Scanned Report');
      setScreen('reportProcessing' as Screen);
      setReportThumbnail(thumb);

      const key = await computeKey(b64, selectedLang.code);

      if (reportCache.has(key)) {
        setAnalysisResult(reportCache.get(key)!);
        setScreen('reportAnalyzer' as Screen);
        return;
      }

      try {
        const res = await fetch('/api/scan-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: b64, language: selectedLang.code }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? `Server error ${res.status}`);

        reportCache.set(key, data);
        setAnalysisResult(data);
        setScreen('reportAnalyzer' as Screen);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to analyze report.');
        setScreen('error');
      }
      return;
    }

    setScreen('processing');

    const key = await computeKey(b64, selectedLang.code);

    if (scanCache.has(key)) {
      setResult(scanCache.get(key)!);
      setThumbnail(thumb);
      setScreen('results');
      return;
    }

    try {
      const endpoint = scanMode === 'prescription' ? '/api/scan-prescription' : '/api/scan';
      const res = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ image: b64, language: selectedLang.code }),
      });

      const data = await res.json();

      if (!res.ok || data.error) throw new Error(data.error ?? `Server error ${res.status}`);

      let final: ResultData;
      if (scanMode === 'prescription') {
        final = { ...data as PrescriptionResult, timestamp: Date.now(), language: selectedLang.code, scanMode: 'prescription' };
      } else {
        final = { ...data as ScanResult, timestamp: Date.now(), language: selectedLang.code, scanMode: 'label' };
      }

      scanCache.set(key, final);

      setResult(final);
      setThumbnail(thumb);
      setHistory(prev => [{
        id: Date.now().toString(), result: final, thumbnail: thumb, timestamp: Date.now(),
      }, ...prev].slice(0, 20));
      setScreen('results');

    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      setScreen('error');
    }
  }, [camera, tts, selectedLang, scanMode]);

  const handleCameraBack = useCallback(() => { camera.stopStream(); setScreen('idle'); }, [camera]);

  const handleCancelProcessing = useCallback(() => {
    tts.stop();
    setResult(null);
    setThumbnail(undefined);
    setErrorMsg('');
    setScreen('idle');
  }, [tts]);

  const handleCancelReportProcessing = useCallback(() => {
    tts.stop();
    setAnalysisResult(null);
    setReportThumbnail(undefined);
    setUploadedFileName('');
    setErrorMsg('');
    setScreen('idle');
  }, [tts]);

  const handleRescan = useCallback(async () => {
    tts.stop(); setResult(null); setErrorMsg(''); setThumbnail(undefined);
    try { await camera.startStream(); setScreen('camera'); }
    catch { setErrorMsg('Camera access denied.'); setScreen('error'); }
  }, [camera, tts]);

  const handleHome = useCallback(() => {
    tts.stop(); camera.stopStream(); setResult(null); setErrorMsg(''); setThumbnail(undefined);
    setScreen('idle');
  }, [camera, tts]);

  const handleViewHistory  = useCallback(() => { tts.stop(); setScreen('history' as Screen); }, [tts]);

  const handleSelectHistory = useCallback((item: HistoryItem) => {
    setResult(item.result);
    setThumbnail(item.thumbnail);
    const mode = item.result.scanMode || 'label';
    setScanMode(mode as ScanMode);
    setSelectedLang(LANGUAGES.find(l => l.code === item.result.language) || LANGUAGES[0]);
    setScreen('results');
  }, []);

  const handleClearHistory = useCallback(() => { setHistory([]); setScreen('idle'); }, []);

  // Report Analyzer Handlers
  const handleOpenReportAnalyzer = useCallback(() => {
    setAnalysisResult(null);
    setReportThumbnail(undefined);
    setUploadedFileName('');
    setErrorMsg('');
    setScreen('reportUpload' as Screen);
  }, []);

  const handleScanReport = useCallback(() => {
    setAnalysisResult(null);
    setReportThumbnail(undefined);
    setUploadedFileName('');
    setErrorMsg('');
    handleStart('report');
  }, [handleStart]);

  const handleReportUpload = useCallback(async (file: File) => {
    setUploadedFileName(file.name);
    setScreen('reportProcessing' as Screen);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = (reader.result as string).split(',')[1];
          if (result) resolve(result);
          else reject(new Error('Failed to read file.'));
        };
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsDataURL(file);
      });

      const thumb = base64.length > 60000 ? base64.slice(0, 60000) : base64;
      setReportThumbnail(thumb);

      const key = await computeKey(base64, selectedLang.code);
      if (reportCache.has(key)) {
        setAnalysisResult(reportCache.get(key)!);
        setScreen('reportAnalyzer' as Screen);
        return;
      }

      const analysisData = await analyzeReport(file.type, base64, selectedLang.code);
      reportCache.set(key, analysisData);

      setAnalysisResult(analysisData);
      setScreen('reportAnalyzer' as Screen);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to analyze report. Please try again.');
      setScreen('error');
    }
  }, [selectedLang]);

  const handleReportHome = useCallback(() => {
    tts.stop(); // stop any playing audio before navigating away
    setAnalysisResult(null);
    setReportThumbnail(undefined);
    setUploadedFileName('');
    setErrorMsg('');
    setScreen('idle');
  }, [tts]);

  if (screen === ('history' as Screen)) {
    return <HistoryScreen history={history} onSelect={handleSelectHistory} onBack={() => setScreen('idle')} onClear={handleClearHistory} />;
  }

  switch (screen) {
    case 'idle':
      return <IdleScreen onStart={handleStart} selectedLang={selectedLang} onLangChange={setSelectedLang} historyCount={history.length} onViewHistory={handleViewHistory} onAnalyzeReport={handleOpenReportAnalyzer} onScanReport={handleScanReport} />;
    case 'camera':
      return <CameraScreen videoRef={camera.videoRef} canvasRef={camera.canvasRef} onCapture={handleCapture} onBack={handleCameraBack} scanMode={scanMode} />;
    case 'processing':
      return <ProcessingScreen language={selectedLang.code} scanMode={scanMode} onCancel={handleCancelProcessing} />;
    case 'results':
      return result ? (
        <ResultsScreen
          result={result} isSpeaking={tts.isSpeaking} isLoadingBhashini={tts.isLoadingBhashini}
          onSpeak={tts.speak} onStop={tts.stop}
          onRescan={handleRescan} onHome={handleHome}
          selectedLang={selectedLang} thumbnail={thumbnail}
        />
      ) : null;
    case 'reportUpload':
      return <ReportUploadScreen onUpload={handleReportUpload} onCancel={handleReportHome} onScanReport={handleScanReport} />;
    case 'reportProcessing':
      return <ReportProcessingScreen fileName={uploadedFileName} onCancel={handleCancelReportProcessing} />;
    case 'reportAnalyzer':
      return analysisResult ? (
        <ReportAnalyzer result={analysisResult} onHome={handleReportHome} thumbnail={reportThumbnail}
          onSpeak={tts.speak} onStop={tts.stop} isSpeaking={tts.isSpeaking}
          isLoadingBhashini={tts.isLoadingBhashini} selectedLang={selectedLang}
        />
      ) : null;
    case 'error':
      return <ErrorScreen message={errorMsg} onRetry={handleRescan} onHome={handleHome} />;
    default: return null;
  }
};

export default App;
