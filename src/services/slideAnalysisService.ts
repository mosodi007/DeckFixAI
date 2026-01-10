import { supabase } from './analysisService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function analyzeSlides(analysisId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Starting slide analysis for:', analysisId);

    const headers: Record<string, string> = {
      'apikey': supabaseKey,
      'Content-Type': 'application/json',
    };

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/analyze-slides`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ analysisId }),
      }
    );

    if (!response.ok) {
      let errorMessage = 'Failed to analyze slides';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
        console.error('Error from API:', error);
      } catch (e) {
        const text = await response.text();
        console.error('Error response text:', text);
        errorMessage = text || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Slide analysis result:', result);

    return {
      success: result.success,
      message: result.message || 'Slides analyzed successfully',
    };
  } catch (error) {
    console.error('Failed to analyze slides:', error);
    throw error;
  }
}
