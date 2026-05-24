import React, { useCallback, useState } from 'react';
import type { AnalysisResult, KeyMetric } from '../types';
import { analyzeReport } from '../api/reportAnalyzer';

type LoadingState = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';

interface DropZoneState {
  isDragActive: boolean;
  file: File | null;
}

export const ReportAnalyzer: React.FC = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [dropZone, setDropZone] = useState<DropZoneState>({
    isDragActive: false,
    file: null,
  });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Validate file type
  const isValidFile = (file: File): boolean => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    return validTypes.includes(file.type);
  };

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDropZone((prev) => ({ ...prev, isDragActive: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDropZone((prev) => ({ ...prev, isDragActive: false }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Extract base64 part
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  // Process file upload
  const processFile = useCallback(
    async (file: File) => {
      if (!isValidFile(file)) {
        setErrorMsg('Please upload a PDF or image file (PNG, JPEG, WebP)');
        setLoadingState('error');
        return;
      }

      setDropZone({ isDragActive: false, file });
      setErrorMsg('');
      setLoadingState('uploading');

      try {
        const base64 = await fileToBase64(file);
        setLoadingState('analyzing');

        // Call mock API
        const response = await analyzeReport(file.type, base64);
        setResult(response);
        setLoadingState('complete');
      } catch (error) {
        setErrorMsg(
          error instanceof Error
            ? error.message
            : 'Failed to analyze report. Please try again.'
        );
        setLoadingState('error');
      }
    },
    []
  );

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDropZone((prev) => ({ ...prev, isDragActive: false }));

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile]
  );

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.currentTarget.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile]
  );

  // Reset state
  const handleReset = useCallback(() => {
    setLoadingState('idle');
    setDropZone({ isDragActive: false, file: null });
    setResult(null);
    setErrorMsg('');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Medical Report Analyzer
          </h1>
          <p className="text-gray-600">
            Upload a medical report (PDF or image) for instant analysis
          </p>
        </div>

        {/* Main Content */}
        {loadingState === 'idle' && !result && (
          <DropZoneComponent
            isDragActive={dropZone.isDragActive}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onFileInputChange={handleFileInputChange}
          />
        )}

        {loadingState === 'uploading' && (
          <LoadingState message="Uploading your file..." />
        )}

        {loadingState === 'analyzing' && (
          <AnalyzingState />
        )}

        {loadingState === 'complete' && result && (
          <ResultsDisplay result={result} onReset={handleReset} />
        )}

        {loadingState === 'error' && (
          <ErrorState message={errorMsg} onRetry={handleReset} />
        )}
      </div>
    </div>
  );
};

/**
 * Drop Zone Component
 */
interface DropZoneComponentProps {
  isDragActive: boolean;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const DropZoneComponent: React.FC<DropZoneComponentProps> = ({
  isDragActive,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileInputChange,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 cursor-pointer ${
        isDragActive
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-gray-300 bg-white hover:border-indigo-400'
      }`}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        onChange={onFileInputChange}
        className="hidden"
        aria-label="Upload medical report"
      />

      <div className="space-y-4">
        <div className="text-5xl">📄</div>
        <div>
          <p className="text-lg font-semibold text-gray-900">
            {isDragActive
              ? 'Drop your file here'
              : 'Drag & drop your medical report here'}
          </p>
          <p className="text-gray-600 mt-1">or click to select a file</p>
        </div>
        <p className="text-sm text-gray-500">
          Supported formats: PDF, PNG, JPEG, WebP
        </p>
      </div>
    </div>
  );
};

/**
 * Loading State Component
 */
interface LoadingStateProps {
  message: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ message }) => (
  <div className="bg-white rounded-lg shadow-lg p-8">
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-gray-600 font-medium">{message}</p>
    </div>
  </div>
);

/**
 * Analyzing State Component (with skeleton loading)
 */
const AnalyzingState: React.FC = () => (
  <div className="space-y-6">
    {/* Pulsing Header */}
    <div className="bg-white rounded-lg shadow p-8">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-indigo-200 rounded-full animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
        </div>
      </div>
    </div>

    {/* Skeleton Cards */}
    <div className="grid md:grid-cols-2 gap-6">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="bg-white rounded-lg shadow p-6 space-y-4 animate-pulse"
        >
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded" />
            <div className="h-3 bg-gray-100 rounded w-5/6" />
            <div className="h-3 bg-gray-100 rounded w-4/6" />
          </div>
        </div>
      ))}
    </div>

    {/* Loading Message */}
    <div className="text-center text-gray-600 font-medium">
      Analyzing your medical report...
    </div>
  </div>
);

/**
 * Results Display Component
 */
interface ResultsDisplayProps {
  result: AnalysisResult;
  onReset: () => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, onReset }) => (
  <div className="space-y-6">
    {/* Header with Action Button */}
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-gray-900">Analysis Results</h2>
      <button
        onClick={onReset}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium"
      >
        Analyze Another Report
      </button>
    </div>

    {/* Summary Section */}
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
        <span className="text-2xl mr-2">📋</span>
        Summary
      </h3>
      <p className="text-gray-700 leading-relaxed text-base">
        {result.summary}
      </p>
    </div>

    {/* Key Metrics Section */}
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
        <span className="text-2xl mr-2">📊</span>
        Key Metrics
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Marker
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Value
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {result.keyMetrics.map((metric, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4 text-gray-900 font-medium">
                  {metric.name}
                </td>
                <td className="py-3 px-4 text-gray-700">{metric.value}</td>
                <td className="py-3 px-4">
                  <StatusBadge status={metric.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Actionable Next Steps Section */}
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
        <span className="text-2xl mr-2">✨</span>
        Actionable Next Steps
      </h3>
      <ul className="space-y-3">
        {result.nextSteps.map((step, idx) => (
          <li
            key={idx}
            className="flex items-start space-x-3 text-gray-700 leading-relaxed"
          >
            <span className="text-indigo-600 font-bold mt-0.5 flex-shrink-0">
              •
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </div>

    {/* Disclaimer */}
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <p className="text-sm text-blue-900">
        <span className="font-semibold">Disclaimer:</span> This analysis is for
        informational purposes only. Always consult with your healthcare
        provider for professional medical advice.
      </p>
    </div>
  </div>
);

/**
 * Status Badge Component
 */
type StatusType = 'normal' | 'high' | 'low';

interface StatusBadgeProps {
  status: StatusType;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusConfig = {
    normal: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'Normal',
    },
    high: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      label: 'High',
    },
    low: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: 'Low',
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
};

/**
 * Error State Component
 */
interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
    <div className="text-5xl mb-4">❌</div>
    <h3 className="text-xl font-bold text-red-900 mb-2">Analysis Failed</h3>
    <p className="text-red-700 mb-6">{message}</p>
    <button
      onClick={onRetry}
      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium"
    >
      Try Again
    </button>
  </div>
);
