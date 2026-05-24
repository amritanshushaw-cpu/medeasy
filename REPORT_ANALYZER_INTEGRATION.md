# Report Analyzer Component - Integration Guide

## Overview

The Report Analyzer component provides a complete medical report analysis interface with file upload, analysis, and results display capabilities. It's built with TypeScript, React, and Tailwind CSS.

## Files Created

1. **`src/components/ReportAnalyzer.tsx`** - Main component with all UI subcomponents
2. **`src/api/reportAnalyzer.ts`** - Mock API layer for report analysis
3. **`src/types.ts`** - Updated with new TypeScript types for Report Analyzer

## Features

✅ Drag-and-drop file upload (PDF, PNG, JPEG, WebP)  
✅ File validation and error handling  
✅ Elegant loading states with pulsing skeleton UI  
✅ Color-coded results dashboard  
✅ Accessible React UI with proper ARIA labels  
✅ Responsive Tailwind CSS styling  
✅ Mock API layer ready for real LLM integration  
✅ TypeScript support throughout  

## Integration Steps

### 1. Import the Component

In your main application file (e.g., `App.tsx` or a routing component), import the `ReportAnalyzer`:

```typescript
import { ReportAnalyzer } from './components/ReportAnalyzer';
```

### 2. Add to Your App Navigation

If you're using the screen-based navigation pattern (like your current app), update your screen types and routing:

```typescript
// In types.ts, update the Screen type:
export type Screen = 'idle' | 'camera' | 'processing' | 'results' | 'error' | 'reportAnalyzer';

// In App.tsx, render it based on screen state:
{screen === 'reportAnalyzer' && <ReportAnalyzer />}
```

### 3. Add Navigation Link

Add a button or link to navigate to the Report Analyzer from your idle screen or main menu:

```typescript
<button
  onClick={() => setScreen('reportAnalyzer')}
  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
>
  📊 Analyze Medical Report
</button>
```

### 4. Quick Standalone Usage

For standalone usage without app-level routing:

```typescript
import { ReportAnalyzer } from './components/ReportAnalyzer';

export default function MyPage() {
  return <ReportAnalyzer />;
}
```

## Data Structure

### `AnalysisResult` Type

```typescript
interface AnalysisResult {
  summary: string;           // Plain-English overview of the report
  keyMetrics: KeyMetric[];   // Array of medical markers with values and status
  nextSteps: string[];       // Recommended actions or questions for doctor
  timestamp?: number;        // Optional: when analysis was performed
}

interface KeyMetric {
  name: string;              // Marker name (e.g., "Hemoglobin")
  value: string;             // Measured value with unit (e.g., "14.2 g/dL")
  status: 'normal' | 'high' | 'low'; // Health status indicator
}
```

## Connecting Your LLM/AI Backend

### Step 1: Update the API Function

Edit `src/api/reportAnalyzer.ts` and replace the `analyzeReport` function:

```typescript
export async function analyzeReport(
  fileType: string,
  base64Data: string
): Promise<AnalysisResult> {
  const response = await fetch('https://your-api-endpoint.com/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.VITE_API_KEY}`,
    },
    body: JSON.stringify({
      fileType,
      fileData: base64Data,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  const data = await response.json();
  return parseAnalysisResponse(data);
}
```

### Step 2: Update the Parser

Modify `parseAnalysisResponse()` to match your API's response format:

```typescript
export function parseAnalysisResponse(apiResponse: any): AnalysisResult {
  return {
    summary: apiResponse.analysis?.summary || '',
    keyMetrics: apiResponse.analysis?.metrics?.map((m: any) => ({
      name: m.marker_name,
      value: m.measurement,
      status: m.health_status, // Must be 'normal' | 'high' | 'low'
    })) || [],
    nextSteps: apiResponse.recommendations || [],
    timestamp: Date.now(),
  };
}
```

### Step 3: Set Environment Variables

Add your API credentials to `.env.local`:

```bash
VITE_API_KEY=your_api_key_here
VITE_API_ENDPOINT=https://your-api.com
```

Access them in your component:
```typescript
const apiKey = import.meta.env.VITE_API_KEY;
```

## API Response Example

Expected format from your backend:

```json
{
  "summary": "Blood test shows generally good health...",
  "keyMetrics": [
    {
      "name": "Hemoglobin",
      "value": "14.2 g/dL",
      "status": "normal"
    },
    {
      "name": "Glucose (Fasting)",
      "value": "108 mg/dL",
      "status": "high"
    }
  ],
  "nextSteps": [
    "Schedule follow-up appointment with your doctor",
    "Consider dietary changes to manage glucose levels"
  ]
}
```

## Supported File Types

- **PDF**: `application/pdf`
- **JPEG**: `image/jpeg`
- **PNG**: `image/png`
- **WebP**: `image/webp`

Files are converted to base64 and sent to your API.

## Accessibility Features

✅ ARIA labels on interactive elements  
✅ Keyboard navigation support  
✅ Semantic HTML structure  
✅ Color-blind friendly status indicators (uses text + color)  
✅ Proper focus management  

## Customization

### Change Colors

Update Tailwind class names in component:
```typescript
// Change primary color from indigo to your preferred color
className="bg-indigo-600" // Change 'indigo' to 'blue', 'purple', etc.
```

### Modify Loading Message

In `AnalyzingState` component:
```typescript
<div className="text-center text-gray-600 font-medium">
  Analyzing your medical report...
</div>
```

### Add Custom Icons

Replace emoji icons with actual SVG components:
```typescript
// Current
<div className="text-5xl">📄</div>

// Alternative
<FileUploadIcon className="w-12 h-12" />
```

## Error Handling

The component handles:
- Invalid file types
- Network errors
- API failures
- Large file sizes

Errors display with a user-friendly message and retry button.

## Performance Optimization

- **File validation**: Checks file type before upload
- **Base64 conversion**: Efficiently converts files to base64
- **Debouncing**: Uses useCallback for memoized handlers
- **State management**: Minimal re-renders with proper state structure

## Testing Mock API

The component includes a mock API that:
1. Simulates 2-second network delay
2. Returns realistic medical data
3. Shows the expected data structure

To test with real API, simply update the `analyzeReport` function without changing any component code.

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- IE11: ❌ Not supported

## Dependencies

- React 18.3+
- TypeScript 5.4+
- Tailwind CSS (for styling)

## Troubleshooting

### Component not rendering?
- Ensure React 18+ is installed
- Check that Tailwind CSS is properly configured
- Verify imports are correct

### File upload not working?
- Check browser console for errors
- Ensure file type is in supported formats
- Verify browser permissions for file access

### Styling looks broken?
- Confirm Tailwind CSS build is running
- Clear browser cache
- Check that `global.css` is imported in `main.tsx`

### API integration issues?
- Test API endpoint separately with Postman
- Check CORS headers on your API
- Verify API key is correctly set
- Check response format matches `AnalysisResult` interface

## Future Enhancements

Consider adding:
- Multiple file upload support
- OCR for better image-to-text conversion
- Trending analysis (compare reports over time)
- Export results as PDF
- Integration with EHR systems
- Multilingual support
- Voice-to-text for next steps
- Real-time analysis progress tracking

---

**Questions or issues?** Check the mock implementation in `reportAnalyzer.ts` for reference integration patterns.
