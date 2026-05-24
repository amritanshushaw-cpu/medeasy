import React from 'react';

interface ReportProcessingScreenProps {
  fileName?: string;
}

export const ReportProcessingScreen: React.FC<ReportProcessingScreenProps> = ({ fileName }) => {
  const steps = [
    { icon: '📄', label: 'Reading document' },
    { icon: '🔍', label: 'Extracting text' },
    { icon: '🧠', label: 'Analyzing data' },
    { icon: '✨', label: 'Generating insights' },
  ];

  return (
    <div className="screen" role="status" aria-live="polite" aria-label="Analyzing your medical report">
      {/* Background orbs */}
      <div aria-hidden style={{ position: 'absolute', top: '-140px', right: '-140px', width: '400px', height: '400px', borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(244,196,48,.07) 0%, transparent 70%)' }} />
      <div aria-hidden style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '300px', height: '300px', borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(139,92,246,.07) 0%, transparent 70%)' }} />

      <div style={{ textAlign: 'center', maxWidth: '380px' }}>
        {/* Spinner */}
        <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 28px' }}>
          <div
            className="spin-anim"
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '3px solid rgba(244,196,48,.12)',
              borderTop: '3px solid #F4C430',
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
            }}
          >
            📊
          </div>
        </div>

        {/* Title */}
        <h2 className="display" style={{ fontSize: '40px', color: '#F4C430', marginBottom: '10px', lineHeight: 1 }}>
          Analyzing Report
        </h2>

        {/* File name (if available) */}
        {fileName && (
          <p style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '16px', wordBreak: 'break-all' }}>
            {fileName}
          </p>
        )}

        {/* Status message */}
        <p style={{ fontSize: '16px', color: 'rgba(240,238,248,.5)', marginBottom: '28px', lineHeight: 1.5 }}>
          Using AI to understand your report
          <span className="dot1">.</span><span className="dot2">.</span><span className="dot3">.</span>
        </p>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {steps.map((step, i) => (
            <div
              key={step.label}
              className="slide-up"
              style={{
                animationDelay: `${i * 0.15}s`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: '12px',
                background: 'rgba(244,196,48,.06)',
                border: '1px solid rgba(244,196,48,.12)',
              }}
            >
              <span style={{ fontSize: '18px' }}>{step.icon}</span>
              <span style={{ fontSize: '14px', color: 'rgba(244,196,48,.7)', fontWeight: 500 }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div
          style={{
            marginTop: '24px',
            height: '3px',
            borderRadius: '2px',
            background: 'rgba(255,255,255,.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #F4C430, #8B5CF6, #06B6D4)',
              animation: 'gradient-x 2s ease-in-out infinite',
              backgroundSize: '200% 100%',
            }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
};
