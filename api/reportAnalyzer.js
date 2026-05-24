import type { AnalysisResult } from '../types';

/**
 * Mock API function to analyze medical reports
 * Replace this with your actual LLM/AI backend API call
 *
 * @param fileType - MIME type of the uploaded file
 * @param base64Data - Base64 encoded file data
 * @returns Promise<AnalysisResult> - Analyzed report data
 *
 * @example
 * // To integrate with a real API:
 * // 1. Replace the mock response with a fetch call to your backend
 * // 2. Send the base64Data to your LLM/AI service
 * // 3. Parse and structure the response according to AnalysisResult interface
 */
export async function analyzeReport(
  fileType: string,
  base64Data: string
): Promise<AnalysisResult> {
  // Simulate network delay (remove in production)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // TODO: Replace with your actual API call:
  // const response = await fetch('https://your-api.com/analyze', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${YOUR_API_KEY}`,
  //   },
  //   body: JSON.stringify({
  //     fileType,
  //     fileData: base64Data,
  //   }),
  // });
  //
  // if (!response.ok) {
  //   throw new Error(`API error: ${response.statusText}`);
  // }
  //
  // const data = await response.json();
  // return parseAnalysisResponse(data);

  // Mock response for demonstration
  return generateMockAnalysis();
}

/**
 * Generate a mock analysis result for demonstration
 * This shows the expected data structure
 */
function generateMockAnalysis(): AnalysisResult {
  return {
    summary:
      'This blood test report shows generally good health with a few metrics that may warrant follow-up with your physician. Your glucose levels are slightly elevated, which could indicate early signs of prediabetes, but all other values are within normal ranges. The lipid panel shows healthy cholesterol levels, suggesting good cardiovascular health.',
    keyMetrics: [
      {
        name: 'Hemoglobin',
        value: '14.2 g/dL',
        status: 'normal',
      },
      {
        name: 'Glucose (Fasting)',
        value: '108 mg/dL',
        status: 'high',
      },
      {
        name: 'Total Cholesterol',
        value: '185 mg/dL',
        status: 'normal',
      },
      {
        name: 'HDL Cholesterol',
        value: '52 mg/dL',
        status: 'normal',
      },
      {
        name: 'LDL Cholesterol',
        value: '110 mg/dL',
        status: 'normal',
      },
      {
        name: 'Triglycerides',
        value: '95 mg/dL',
        status: 'normal',
      },
      {
        name: 'Creatinine',
        value: '0.9 mg/dL',
        status: 'normal',
      },
      {
        name: 'White Blood Cells',
        value: '7.2 K/uL',
        status: 'normal',
      },
    ],
    nextSteps: [
      'Schedule a follow-up appointment with your doctor to discuss the elevated fasting glucose level',
      'Consider lifestyle modifications including increased physical activity (150 minutes per week) and dietary changes',
      'Reduce refined carbohydrate and sugar intake to help manage glucose levels',
      'Maintain a healthy weight through balanced diet and regular exercise',
      'Retest glucose levels in 3-6 months to monitor trends',
      'Ask your doctor about diabetes risk assessment or prediabetes prevention program',
    ],
    timestamp: Date.now(),
  };
}

/**
 * Example parser for your actual API response
 * Adjust according to your backend API response structure
 *
 * @param apiResponse - Raw response from your API
 * @returns AnalysisResult - Parsed result
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseAnalysisResponse(apiResponse: any): AnalysisResult {
  // This is an example - modify based on your actual API response format
  return {
    summary: apiResponse.summary || '',
    keyMetrics: Array.isArray(apiResponse.metrics)
      ? apiResponse.metrics.map(
          (m: {
            name: string;
            value: string;
            status: 'normal' | 'high' | 'low';
          }) => ({
            name: m.name,
            value: m.value,
            status: m.status,
          })
        )
      : [],
    nextSteps: Array.isArray(apiResponse.steps) ? apiResponse.steps : [],
    timestamp: Date.now(),
  };
}
