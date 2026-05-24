import React from 'react';
import type { AnalysisResult } from '../types';

interface ReportAnalyzerProps {
  result: AnalysisResult;
  onHome: () => void;
  thumbnail?: string;
}

export const ReportAnalyzer: React.FC<ReportAnalyzerProps> = ({ result, onHome, thumbnail }) => {
  return (
    <div className="screen" role="main" style={{ justifyContent: 'flex-start', paddingTop: '32px', paddingBottom: '32px', gap: '24px' }}>
      {/* Background orbs */}
      <div aria-hidden style={{ position: 'absolute', top: '-120px', right: '-120px', width: '360px', height: '360px', borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(245,158,11,.08) 0%, transparent 70%)' }} />
      <div aria-hidden style={{ position: 'absolute', bottom: '-100px', left: '-80px', width: '320px', height: '320px', borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(139,92,246,.07) 0%, transparent 70%)' }} />

      <div style={{ width: '100%', maxWidth: '520px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 className="display gradient-text" style={{ fontSize: '42px', marginBottom: '4px' }}>
              📊 Report Analysis
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text2)' }}>AI-powered medical insights</p>
          </div>
          <button className="btn-icon" onClick={onHome} aria-label="Go home" style={{ width: '44px', height: '44px' }}>
            <span style={{ fontSize: '20px' }}>🏠</span>
          </button>
        </div>

        {/* Thumbnail Preview (if available) */}
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

        {/* Disclaimer */}
        <div className="glass" style={{ marginTop: '18px', padding: '12px 14px', borderLeft: '3px solid var(--text3)' }}>
          <p style={{ fontSize: '13px', color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
            💡 <span style={{ fontWeight: 600 }}>Disclaimer:</span> This AI analysis is for informational purposes. Always consult your doctor for medical advice.
          </p>
        </div>

        {/* Action Button */}
        <button className="btn-primary" onClick={onHome} style={{ width: '100%', marginTop: '20px' }} aria-label="Go home">
          <span style={{ fontSize: '20px' }}>🏠</span> Home
        </button>
      </div>
    </div>
  );
};

/**
 * Metric Card Component
 */
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
