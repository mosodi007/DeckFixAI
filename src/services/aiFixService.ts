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
  imageUrl: string | null,
  estimatedCreditCost?: number,
  complexityScore?: number
): Promise<{ success: boolean; fix?: GeneratedFix; fixId?: string; error?: string; requiresAuth?: boolean; requiresUpgrade?: boolean; currentBalance?: number; requiredCredits?: number }> {
  try {
    const headers: Record<string, string> = {
      'apikey': supabaseKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/generate-slide-fix`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          analysisId,
          pageNumber,
          slideTitle,
          slideScore,
          slideContent,
          slideFeedback,
          slideRecommendations,
          imageUrl,
          estimatedCreditCost: estimatedCreditCost || 4,
          complexityScore: complexityScore || 50,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          requiresAuth: true,
          error: result.error || 'Authentication required',
        };
      }

      if (response.status === 402) {
        return {
          success: false,
          requiresUpgrade: true,
          currentBalance: result.currentBalance,
          requiredCredits: result.requiredCredits,
          error: result.error || 'Insufficient credits',
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to generate fix',
      };
    }

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

export async function generateIssueFix(
  analysisId: string,
  issueType: 'deal_breaker' | 'red_flag' | 'missing_slide',
  issueTitle: string,
  issueDescription: string,
  issueRecommendation?: string,
  issueImpact?: string,
  issueSuggestedContent?: string,
  issueCategory?: string,
  issueSeverity?: string,
  deckContext?: {
    fileName?: string;
    overallScore?: number;
    keyMetrics?: any;
  }
): Promise<{ success: boolean; fix?: GeneratedFix; fixId?: string; error?: string; requiresAuth?: boolean; requiresUpgrade?: boolean; currentBalance?: number; requiredCredits?: number }> {
  try {
    const headers: Record<string, string> = {
      'apikey': supabaseKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Get session and refresh if needed
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();

    // Check if session is expired or about to expire (within 2 minutes)
    let needsRefresh = false;
    if (session?.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();

      // Refresh if expired or expires within 2 minutes
      if (timeUntilExpiry < 120000) {
        needsRefresh = true;
      }
    } else if (!session) {
      needsRefresh = true;
    }

    // Refresh session if needed
    if (needsRefresh) {
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshData.session) {
          session = refreshData.session;
        } else if (!session) {
          throw new Error('No active session. Please log in and try again.');
        }
      } catch (refreshErr: any) {
        if (!session) {
          throw new Error('Session expired. Please log in and try again.');
        }
      }
    }

    if (!session?.access_token) {
      return {
        success: false,
        error: 'Authentication required. Please log in and try again.',
        requiresAuth: true,
      };
    }

    headers['Authorization'] = `Bearer ${session.access_token}`;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/generate-issue-fix`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          analysisId,
          issueType,
          issueTitle,
          issueDescription,
          issueRecommendation,
          issueImpact,
          issueSuggestedContent,
          issueCategory,
          issueSeverity,
          deckContext,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      if (response.status === 401) {
        return {
          success: false,
          error: error.error || 'Authentication failed. Please log in and try again.',
          requiresAuth: true,
        };
      }

      if (response.status === 402) {
        return {
          success: false,
          error: error.error || 'Insufficient credits',
          requiresUpgrade: true,
          currentBalance: error.currentBalance,
          requiredCredits: error.requiredCredits,
        };
      }

      return {
        success: false,
        error: error.error || 'Failed to generate fix',
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error generating issue fix:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate fix',
    };
  }
}
