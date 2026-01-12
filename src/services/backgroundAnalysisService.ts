import { supabase } from './analysisService';
import { v4 as uuidv4 } from 'uuid';

export interface AnalysisStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string | null;
}

/**
 * Creates an analysis record in the database with 'pending' status
 * This allows the UI to immediately show the deck while analysis runs in background
 */
export async function createAnalysisRecord(
  fileName: string,
  fileSize: number,
  totalPages: number,
  userId: string
): Promise<string> {
  const analysisId = uuidv4();

  const { error } = await supabase
    .from('analyses')
    .insert({
      id: analysisId,
      user_id: userId,
      file_name: fileName,
      file_size: fileSize,
      total_pages: totalPages,
      overall_score: 0,
      summary: 'Analysis pending...',
      status: 'pending',
    });

  if (error) {
    console.error('Failed to create analysis record:', error);
    throw new Error(`Failed to create analysis record: ${error.message}`);
  }

  console.log('Analysis record created with status: pending, ID:', analysisId);
  return analysisId;
}

/**
 * Starts background analysis by calling the Edge Function
 * This is fire-and-forget - we don't wait for the response
 */
export async function startBackgroundAnalysis(
  file: File,
  analysisId: string,
  imageUrls: string[]
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('analysisId', analysisId);
  formData.append('imageUrls', JSON.stringify(imageUrls));

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
    throw new Error('Authentication required. Please log in and try again.');
  }

  const headers: Record<string, string> = {
    'apikey': supabaseKey,
    'Accept': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };

  // Fire and forget - don't await the response
  // The Edge Function will update the status in the database
  fetch(`${supabaseUrl}/functions/v1/analyze-deck`, {
    method: 'POST',
    headers,
    body: formData,
  })
    .then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Background analysis failed:', error);
        
        // Update status to failed
        await supabase
          .from('analyses')
          .update({
            status: 'failed',
            error_message: error.error || 'Analysis failed',
          })
          .eq('id', analysisId);
      } else {
        console.log('Background analysis started successfully for:', analysisId);
      }
    })
    .catch(async (error) => {
      console.error('Failed to start background analysis:', error);
      
      // Update status to failed
      await supabase
        .from('analyses')
        .update({
          status: 'failed',
          error_message: error.message || 'Failed to start analysis',
        })
        .eq('id', analysisId);
    });

  console.log('Background analysis request sent for:', analysisId);
}

/**
 * Checks the current status of an analysis
 */
export async function checkAnalysisStatus(analysisId: string): Promise<AnalysisStatus | null> {
  const { data, error } = await supabase
    .from('analyses')
    .select('id, status, error_message')
    .eq('id', analysisId)
    .single();

  if (error) {
    console.error('Failed to check analysis status:', error);
    return null;
  }

  return {
    id: data.id,
    status: data.status || 'pending',
    error_message: data.error_message,
  };
}

