import type { AnalysisResult } from '../types';

export async function analyzeReport(
  _fileType: string,
  base64Data: string,
  language?: string
): Promise<AnalysisResult> {
  const res = await fetch('/api/scan-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Data, language: language || 'en' }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error ?? `Server error ${res.status}`);
  }

  return data as AnalysisResult;
}
