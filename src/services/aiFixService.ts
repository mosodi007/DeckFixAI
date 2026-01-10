import { supabase } from './analysisService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface GeneratedFix {
  issueType: string;
  issueDescription: string;
  exactReplacementText: string;
  visualRecommendations: string[];
  implementationSteps: string[];
  estimatedScoreImprovement: number;
  explanation: string;
  beforeExample: string;
  afterExample: string;
}

export interface SlideFix {
  id: string;
  analysisId: string;
  pageNumber: number;
  issueType: string;
  issueDescription: string;
  generatedFix: GeneratedFix;
  exactReplacementText: string;
  visualRecommendations: string[];
  implementationSteps: string[];
  estimatedScoreImprovement: number;
  applied: boolean;
  createdAt: string;
}

export async function generateSlideFix(
  analysisId: string,
  pageNumber: number,
  slideTitle: string,
  slideScore: number,
  slideContent: string | null,
  slideFeedback: string | null,
  slideRecommendations: string[] | null,
  imageUrl: string | null
): Promise<{ success: boolean; fix?: GeneratedFix; fixId?: string; error?: string }> {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/generate-slide-fix`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisId,
          pageNumber,
          slideTitle,
          slideScore,
          slideContent,
          slideFeedback,
          slideRecommendations,
          imageUrl,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || 'Failed to generate fix',
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error generating fix:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate fix',
    };
  }
}

export async function getSlideFixes(analysisId: string, pageNumber?: number): Promise<SlideFix[]> {
  let query = supabase
    .from('analysis_slide_fixes')
    .select('*')
    .eq('analysis_id', analysisId);

  if (pageNumber !== undefined) {
    query = query.eq('page_number', pageNumber);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching fixes:', error);
    return [];
  }

  return data?.map((fix: any) => ({
    id: fix.id,
    analysisId: fix.analysis_id,
    pageNumber: fix.page_number,
    issueType: fix.issue_type,
    issueDescription: fix.issue_description,
    generatedFix: fix.generated_fix,
    exactReplacementText: fix.exact_replacement_text,
    visualRecommendations: fix.visual_recommendations || [],
    implementationSteps: fix.implementation_steps || [],
    estimatedScoreImprovement: fix.estimated_score_improvement || 0,
    applied: fix.applied || false,
    createdAt: fix.created_at,
  })) || [];
}

export async function markFixAsApplied(fixId: string): Promise<boolean> {
  const { error } = await supabase
    .from('analysis_slide_fixes')
    .update({ applied: true, updated_at: new Date().toISOString() })
    .eq('id', fixId);

  if (error) {
    console.error('Error marking fix as applied:', error);
    return false;
  }

  return true;
}

export async function deleteFix(fixId: string): Promise<boolean> {
  const { error } = await supabase
    .from('analysis_slide_fixes')
    .delete()
    .eq('id', fixId);

  if (error) {
    console.error('Error deleting fix:', error);
    return false;
  }

  return true;
}
