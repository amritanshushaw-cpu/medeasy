import React, { useRef } from 'react';

interface ReportUploadScreenProps {
  onUpload: (file: File) => void;
  onCancel: () => void;
}

export const ReportUploadScreen: React.FC<ReportUploadScreenProps> = ({ onUpload, onCancel }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);

  const isValidFile = (file: File): boolean => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const validSizes = file.size <= 20 * 1024 * 1024; // 20MB max
    return validTypes.includes(file.type) && validSizes;
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>, isActive: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(isActive);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (isValidFile(file)) {
        onUpload(file);
      } else {
        alert('Invalid file. Please upload a PDF or image (PNG, JPEG, WebP) under 20MB.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidFile(file)) {
        onUpload(file);
      } else {
        alert('Invalid file. Please upload a PDF or image (PNG, JPEG, WebP) under 20MB.');
      }
    }
  };

  return (
    <div className="screen" role="main" style={{ justifyContent: 'center' }}>
      {/* Background orbs */}
      <div aria-hidden style={{ position: 'absolute', top: '-160px', right: '-120px', width: '420px', height: '420px', borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(245,158,11,.10) 0%, transparent 68%)' }} />
      <div aria-hidden style={{ position: 'absolute', bottom: '-120px', left: '-100px', width: '360px', height: '360px', borderRadius: '50%', pointerEvents: 'none', background: 'radial-gradient(circle, rgba(139,92,246,.08) 0%, transparent 68%)' }} />

      <div style={{ textAlign: 'center', maxWidth: '440px', width: '100%' }}>
        {/* Icon */}
        <div style={{ fontSize: '64px', marginBottom: '20px' }} aria-hidden>
          📄
        </div>

        {/* Title */}
        <h1 className="display gradient-text" style={{ fontSize: '48px', marginBottom: '8px', lineHeight: 1 }}>
          Upload Report
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text2)', lineHeight: 1.6, marginBottom: '28px' }}>
          Upload your medical report for AI analysis
        </p>

        {/* Upload Zone */}
        <div
          onDragEnter={(e) => handleDrag(e, true)}
          onDragLeave={(e) => handleDrag(e, false)}
          onDragOver={(e) => handleDrag(e, true)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="slide-up"
          style={{
            animationDelay: '0.1s',
            padding: '32px 24px',
            borderRadius: '20px',
            border: `2px dashed ${dragActive ? 'var(--gold)' : 'var(--border2)'}`,
            background: dragActive ? 'rgba(245,158,11,.08)' : 'var(--surface1)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginBottom: '20px',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            aria-label="Upload medical report"
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '48px' }}>📦</span>
          </div>

          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text1)', marginBottom: '6px' }}>
            {dragActive ? 'Drop your file here' : 'Drag & drop your report here'}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text2)' }}>
            or click to browse
          </p>
        </div>

        {/* Supported Formats */}
        <div className="glass" style={{ marginBottom: '20px', padding: '12px 16px', textAlign: 'left' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            ✓ Supported Formats
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text1)' }}>📃 PDF documents</div>
            <div style={{ fontSize: '13px', color: 'var(--text1)' }}>🖼️ PNG images</div>
            <div style={{ fontSize: '13px', color: 'var(--text1)' }}>📷 JPEG photos</div>
            <div style={{ fontSize: '13px', color: 'var(--text1)' }}>🌐 WebP images</div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '8px' }}>
            Max file size: 20 MB
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            className="btn-primary"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Browse files"
          >
            <span style={{ fontSize: '20px' }}>📁</span> Browse Files
          </button>
          <button className="btn-ghost" onClick={onCancel} aria-label="Cancel">
            <span style={{ fontSize: '18px' }}>❌</span> Cancel
          </button>
        </div>

        {/* Tips */}
        <div style={{ marginTop: '20px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(139,92,246,.06)', border: '1px solid rgba(139,92,246,.12)' }}>
          <p style={{ fontSize: '12px', color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
            💡 <span style={{ fontWeight: 600 }}>Pro tip:</span> Clear, well-lit images give the best results. Ensure all text is visible.
          </p>
        </div>
      </div>
    </div>
  );
};
