# DeckFix.ai - Live Setup Guide

DeckFix.ai is now fully integrated with OpenAI and Supabase for real pitch deck analysis!

## What's Been Implemented

### 1. **Database Schema** (Supabase)
- `analyses` - Stores overall analysis results
- `analysis_pages` - Individual page scores and content
- `analysis_metrics` - Clarity, design, content, and structure scores
- `analysis_issues` - Identified issues and improvements
- `missing_slides` - Recommended slides to add

### 2. **Edge Function: `analyze-deck`**
- Accepts PDF file uploads via multipart/form-data
- Uses OpenAI GPT-4o with vision to analyze pitch decks
- Extracts comprehensive insights including:
  - Overall score (0-100)
  - Page-by-page analysis
  - Strengths and weaknesses
  - Issues and improvements
  - Missing critical slides
- Stores all results in Supabase database

### 3. **Frontend Integration**
- Real PDF upload functionality
- Calls analyze-deck Edge Function
- Fetches results from Supabase
- Displays comprehensive analysis
- Shows missing slides with generation options

## Important: Configure Supabase Secret

The Edge Function needs your OpenAI API key. You must set it as a Supabase secret:

### Using Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add a new secret:
   - Name: `OPENAI_API_KEY`
   - Value: `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`
4. Click **Save**

## How It Works

### User Flow:
1. **Upload PDF** → User uploads a pitch deck PDF
2. **Analysis** → Edge function sends PDF to OpenAI GPT-4o
3. **Storage** → Results saved to Supabase database
4. **Display** → Frontend fetches and displays comprehensive analysis

### API Endpoint:
```
POST https://ygbrvmrzydyjjhlgcidm.supabase.co/functions/v1/analyze-deck
```

**Request:**
- Content-Type: multipart/form-data
- Body: PDF file

**Response:**
```json
{
  "analysisId": "uuid",
  "overallScore": 78,
  "summary": "Executive summary...",
  "totalPages": 12
}
```

## Testing the System

1. Start the dev server (already running automatically)
2. Upload a pitch deck PDF
3. Wait for OpenAI analysis (takes 20-60 seconds)
4. View comprehensive results including:
   - Overall score and grade
   - Page-by-page breakdown
   - Strengths and weaknesses
   - Issues to fix
   - Improvements to make
   - Missing slides to add

## What You Get

### Analysis View:
- Overall investment score
- Investment grade (A+ to C-)
- Funding probability
- Detailed metrics breakdown
- Strengths and weaknesses
- Issues and improvements

### Improvement Flow:
- Page-by-page issues
- Priority-based recommendations
- Missing slide detection
- AI-powered slide generation (UI ready)

## Technical Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: Supabase PostgreSQL
- **AI**: OpenAI GPT-4o with Vision
- **Storage**: Supabase (analysis results)

## Notes

- The system accepts PDF files of any size
- OpenAI GPT-4o can analyze up to 20 pages effectively
- Analysis typically takes 20-60 seconds depending on deck size
- All data is stored securely in Supabase
- ROW Level Security is enabled (currently public for demo)

## Future Enhancements

Consider adding:
1. Authentication (Supabase Auth already available)
2. User-specific analysis history
3. Real slide generation with AI
4. Export analysis as PDF report
5. Team collaboration features
6. A/B testing different versions

---

**Your DeckFix.ai is now LIVE and ready to analyze real pitch decks!** 🚀
