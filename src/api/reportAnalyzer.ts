import type { AnalysisResult } from '../types';

/**
 * Analyze medical reports using your LLM backend
 * Currently uses mock data. Replace with your actual API call.
 *
 * @param fileType - MIME type of uploaded file
 * @param base64Data - Base64 encoded file data
 * @returns Promise<AnalysisResult> - Analyzed medical report
 */
export async function analyzeReport(
  _fileType: string,
  _base64Data: string
): Promise<AnalysisResult> {
  // TODO: Replace this with your actual API endpoint
  // Example using Claude API with vision capabilities:
  //
  // const response = await fetch('https://api.anthropic.com/v1/messages', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'x-api-key': import.meta.env.VITE_CLAUDE_API_KEY,
  //   },
  //   body: JSON.stringify({
  //     model: 'claude-3-5-sonnet-20241022',
  //     max_tokens: 1024,
  //     messages: [{
  //       role: 'user',
  //       content: [
  //         {
  //           type: 'image',
  //           source: { type: 'base64', media_type: fileType, data: base64Data },
  //         },
  //         {
  //           type: 'text',
  //           text: 'Analyze this medical report and provide: 1) Plain English summary, 2) Key metrics with status (normal/high/low), 3) Actionable recommendations. Format as JSON.',
  //         },
  //       ],
  //     }],
  //   }),
  // });
  //
  // const data = await response.json();
  // return parseAnalysisResponse(data);

  // For now, simulate network delay and return mock data
  await new Promise((resolve) => setTimeout(resolve, 3000));

  return generateMockAnalysis();
}

/**
 * Generate mock analysis for demonstration
 */
function generateMockAnalysis(): AnalysisResult {
  return {
    summary:
      'This blood test report shows generally good health with a few metrics that need attention. Your hemoglobin levels are normal, indicating good oxygen-carrying capacity. However, your fasting glucose is slightly elevated at 108 mg/dL, which could suggest prediabetic tendencies. All lipid panels are within healthy ranges, showing good cardiovascular health. Total cholesterol and HDL levels are excellent.',
    keyMetrics: [
      {
        name: 'Hemoglobin',
        value: '14.2 g/dL',
        status: 'normal' as const,
      },
      {
        name: 'Glucose (Fasting)',
        value: '108 mg/dL',
        status: 'high' as const,
      },
      {
        name: 'Total Cholesterol',
        value: '185 mg/dL',
        status: 'normal' as const,
      },
      {
        name: 'HDL Cholesterol',
        value: '52 mg/dL',
        status: 'normal' as const,
      },
      {
        name: 'LDL Cholesterol',
        value: '110 mg/dL',
        status: 'normal' as const,
      },
      {
        name: 'Triglycerides',
        value: '95 mg/dL',
        status: 'normal' as const,
      },
      {
        name: 'Creatinine',
        value: '0.9 mg/dL',
        status: 'normal' as const,
      },
      {
        name: 'White Blood Cells',
        value: '7.2 K/uL',
        status: 'normal' as const,
      },
    ],
    nextSteps: [
      'Schedule a follow-up appointment with your doctor to discuss glucose levels and diabetes risk',
      'Increase physical activity to at least 150 minutes of moderate exercise per week',
      'Reduce refined carbohydrates and added sugars from your diet',
      'Maintain a healthy weight through balanced nutrition',
      'Retest glucose levels in 3-6 months to monitor trends',
      'Ask your doctor about dietary counseling or a prediabetes prevention program',
    ],
    timestamp: Date.now(),
  };
}

/**
 * Parse API response and convert to AnalysisResult format
 * Customize this based on your API response structure
 */
export function parseAnalysisResponse(
  apiResponse: {
    summary?: string;
    metrics?: Array<{ name: string; value: string; status: 'normal' | 'high' | 'low' }>;
    recommendations?: string[];
  }
): AnalysisResult {
  return {
    summary: apiResponse.summary || 'No summary available.',
    keyMetrics: Array.isArray(apiResponse.metrics)
      ? apiResponse.metrics.map((m) => ({
          name: m.name,
          value: m.value,
          status: m.status as 'normal' | 'high' | 'low',
        }))
      : [],
    nextSteps: Array.isArray(apiResponse.recommendations)
      ? apiResponse.recommendations
      : [],
    timestamp: Date.now(),
  };
}
