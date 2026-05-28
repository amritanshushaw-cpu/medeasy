import React, { useEffect, useState } from 'react';
import type { AnalysisResult, Language } from '../types';

interface ReportAnalyzerProps {
  result: AnalysisResult;
  onHome: () => void;
  thumbnail?: string;
  onSpeak: (text: string, lang?: string) => void;
  onStop: () => void;
  isSpeaking: boolean;
  isLoadingBhashini?: boolean;
  selectedLang: Language;
}

function buildReportSpeechText(result: AnalysisResult): string {
  const parts: string[] = [];
  if (result.summary) parts.push(`Summary: ${result.summary}`);
  if (result.keyMetrics.length > 0) {
    const metricsText = result.keyMetrics.map(m => `${m.name}: ${m.value}, status: ${m.status}`).join('. ');
    parts.push(`Key metrics: ${metricsText}`);
  }
  if (result.nextSteps.length > 0) {
    const steps = result.nextSteps.map((s, i) => `${i + 1}: ${s}`).join('. ');
    parts.push(`Recommended actions: ${steps}`);
  }
  return parts.join('. ');
}

export const ReportAnalyzer: React.FC<ReportAnalyzerProps> = ({
  result, onHome, thumbnail, onSpeak, onStop, isSpeaking, isLoadingBhashini, selectedLang,
}) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('✓ Copied to clipboard!');
  const speechText = buildReportSpeechText(result);

  useEffect(() => {
    const t = setTimeout(() => onSpeak(speechText, selectedLang.code), 900);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toast = (msg: string) => {
    setToastMsg(msg); setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  const handleShare = async () => {
    const metricsText = result.keyMetrics.length > 0
      ? '\n\nKey Metrics:\n' + result.keyMetrics.map(m => `- ${m.name}: ${m.value} (${m.status})`).join('\n')
      : '';
    const stepsText = result.nextSteps.length > 0
      ? '\n\nRecommended Actions:\n' + result.nextSteps.map(s => `- ${s}`).join('\n')
      : '';
    const text = `📊 MedEasy Report Analysis\n\n${result.summary}${metricsText}${stepsText}\n\nAnalyzed with MedEasy`;
    try {
      if (navigator.share) await navigator.share({ title: 'MedEasy Report Analysis', text });
      else { await navigator.clipboard.writeText(text); toast('✓ Copied to clipboard!'); }
    } catch { /* user cancelled */ }
  };

  const ttsLabel = isLoadingBhashini ? 'Loading...' : isSpeaking ? 'Pause' : `Listen in ${selectedLang.name}`;
  const ttsIcon  = isLoadingBhashini ? '⏳' : isSpeaking ? '⏸' : '🔊';

  return (
    <div className="screen" role="main" style={{ justifyContent: 'flex-start', paddingTop: '32px', paddingBottom: '110px', gap: '24px' }}>
      <div className="orb orb-gold" style={{ top: '-130px', right: '-130px', width: '360px', height: '360px' }} aria-hidden />
      <div className="orb orb-violet" style={{ bottom: '-80px', left: '-80px', width: '280px', height: '280px' }} aria-hidden />

      <div aria-live="polite" className="sr-only">{speechText}</div>

      <div style={{ width: '100%', maxWidth: '520px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 className="display gradient-text" style={{ fontSize: '42px', marginBottom: '4px' }}>
              📊 Report Analysis
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              {selectedLang.code !== 'en' && (
                <span style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600 }}>
                  {selectedLang.flag} {selectedLang.name}
                </span>
              )}
            </div>
          </div>
          <button className="btn-icon" onClick={onHome} aria-label="Go home" style={{ width: '44px', height: '44px' }}>
            <span style={{ fontSize: '20px' }}>🏠</span>
          </button>
        </div>

        {/* Thumbnail Preview */}
        {thumbnail && (
          <div className="glass-strong slide-up" style={{ animationDelay: '0.05s', marginBottom: '18px', padding: '12px' }}>
            <img src={`data:image/jpeg;base64,${thumbnail}`} alt="Uploaded report" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '12px' }} />
          </div>
        )}

        {/* Summary Card */}
        <div className="glass-strong slide-up" style={{ animationDelay: '0.1s', display: 'flex', gap: '14px', alignItems: 'stretch', marginBottom: '12px' }}>
          <div className="card-accent" style={{ background: 'var(--gold)' }} aria-hidden />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '16px' }}>📋</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)', letterSpacing: '1px', textTransform: 'uppercase' }}>Summary</span>
            </div>
            <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text1)', margin: 0 }}>
              {result.summary}
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
            📊 Key Metrics
          </div>
          {result.keyMetrics.length === 0 ? (
            <div className="glass-strong slide-up" style={{ animationDelay: '0.15s', display: 'flex', gap: '12px', padding: '14px' }}>
              <span style={{ fontSize: '18px' }}>ℹ️</span>
              <p style={{ fontSize: '14px', color: 'var(--text2)', margin: 0 }}>No metrics found in report.</p>
            </div>
          ) : (
            result.keyMetrics.map((metric, idx) => (
              <MetricCard key={idx} metric={metric} delay={0.15 + idx * 0.05} />
            ))
          )}
        </div>

        {/* Next Steps */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
            ✨ Recommended Actions
          </div>
          {result.nextSteps.length === 0 ? (
            <div className="glass-strong slide-up" style={{ animationDelay: '0.2s', display: 'flex', gap: '12px', padding: '14px' }}>
              <span style={{ fontSize: '18px' }}>ℹ️</span>
              <p style={{ fontSize: '14px', color: 'var(--text2)', margin: 0 }}>No recommendations available.</p>
            </div>
          ) : (
            result.nextSteps.map((step, idx) => (
              <div key={idx} className="glass-strong slide-up" style={{ animationDelay: `${0.2 + idx * 0.05}s`, display: 'flex', gap: '12px', marginBottom: '8px', padding: '12px' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>✓</span>
                <p style={{ fontSize: '14px', color: 'var(--text1)', margin: 0, lineHeight: 1.5 }}>{step}</p>
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="glass slide-up" style={{ animationDelay: '0.45s', padding: '14px', marginTop: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px', marginBottom: '9px' }}>
            <button
              onClick={() => (isSpeaking || isLoadingBhashini) ? onStop() : onSpeak(speechText, selectedLang.code)}
              className={`btn-action ${isSpeaking ? 'ring-anim' : ''}`}
              disabled={!!isLoadingBhashini}
              aria-label={ttsLabel}
              aria-pressed={isSpeaking}
              style={{
                background: isSpeaking ? 'var(--gold)' : 'rgba(245,158,11,.1)',
                color:      isSpeaking ? '#0A0700'     : 'var(--gold)',
                border: `1.5px solid rgba(245,158,11,${isSpeaking ? '.8' : '.3'})`,
                opacity: isLoadingBhashini ? .7 : 1,
              }}
            >
              <span aria-hidden style={{ fontSize: '20px' }}>{ttsIcon}</span>
              <span style={{ fontSize: '13px' }}>{ttsLabel}</span>
            </button>

            <button
              onClick={handleShare}
              className="btn-action"
              aria-label="Share results"
              style={{ background: 'rgba(6,182,212,.1)', color: 'var(--cyan)', border: '1.5px solid rgba(6,182,212,.3)' }}
            >
              <span aria-hidden style={{ fontSize: '20px' }}>📤</span>
              <span style={{ fontSize: '13px' }}>Share</span>
            </button>
          </div>

          <button className="btn-primary" onClick={onHome} aria-label="Go home">
            <span style={{ fontSize: '20px' }}>🏠</span> Home
          </button>
        </div>

        {/* Disclaimer */}
        <div className="glass" style={{ marginTop: '18px', padding: '12px 14px', borderLeft: '3px solid var(--text3)' }}>
          <p style={{ fontSize: '13px', color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
            💡 <span style={{ fontWeight: 600 }}>Disclaimer:</span> This AI analysis is for informational purposes. Always consult your doctor for medical advice.
          </p>
        </div>
      </div>

      {showToast && <div className="toast" role="status" aria-live="polite">{toastMsg}</div>}
    </div>
  );
};

interface MetricCardProps {
  metric: { name: string; value: string; status: 'normal' | 'high' | 'low' };
  delay: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric, delay }) => {
  const statusColors: Record<string, { border: string; text: string; bg: string }> = {
    normal: { border: 'rgba(16,185,129,.3)', text: '#10B981', bg: 'rgba(16,185,129,.08)' },
    high: { border: 'rgba(244,63,94,.3)', text: '#F43F5E', bg: 'rgba(244,63,94,.08)' },
    low: { border: 'rgba(245,158,11,.3)', text: '#F59E0B', bg: 'rgba(245,158,11,.08)' },
  };

  const colors = statusColors[metric.status];
  const statusLabel = metric.status.charAt(0).toUpperCase() + metric.status.slice(1);

  return (
    <div
      className="glass-strong slide-up"
      style={{
        animationDelay: `${delay}s`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        padding: '12px 14px',
        border: `1px solid ${colors.border}`,
        background: colors.bg,
      }}
    >
      <div>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text1)', margin: '0 0 4px 0' }}>
          {metric.name}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text2)', margin: 0 }}>
          {metric.value}
        </p>
      </div>
      <div
        style={{
          padding: '4px 10px',
          borderRadius: '6px',
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          fontSize: '12px',
          fontWeight: 600,
          color: colors.text,
          whiteSpace: 'nowrap',
        }}
      >
        {statusLabel}
      </div>
    </div>
  );
};
