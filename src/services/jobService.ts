import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface JobStatus {
  status: 'queued' | 'processing' | 'done' | 'failed';
  result?: any;
  error?: string;
  updated_at: string;
}

export interface StartAnalysisResult {
  jobId: string;
  status: string;
}

/**
 * Starts a PDF analysis job
 * @param pdfPath - Path to PDF in storage
 * @param bucket - Storage bucket name
 * @param fileName - Original file name
 * @param fileSize - File size in bytes
 * @returns Job ID and initial status
 */
export async function startAnalysis(
  pdfPath: string,
  bucket: string,
  fileName: string,
  fileSize: number
): Promise<StartAnalysisResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Authentication required. Please log in and try again.');
  }

  // Refresh session if needed
  if (session.expires_at) {
    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();

    if (timeUntilExpiry < 120000) {
      // Less than 2 minutes until expiry, refresh
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('Failed to refresh session:', refreshError);
      }
    }
  }

  const { data: { session: currentSession } } = await supabase.auth.getSession();
  if (!currentSession?.access_token) {
    throw new Error('No active session. Please log in and try again.');
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobService.ts:69',message:'Before Edge Function request',data:{pdfPath,bucket,fileName,fileSize,hasAuthToken:!!currentSession.access_token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
  // #endregion
  // Call Edge Function
  const response = await fetch(`${supabaseUrl}/functions/v1/start-pdf-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentSession.access_token}`,
      'apikey': supabaseKey,
    },
    body: JSON.stringify({
      pdfPath,
      bucket,
      fileName,
      fileSize,
    }),
  });

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobService.ts:84',message:'Edge Function response received',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
  // #endregion

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'jobService.ts:87',message:'Edge Function error response',data:{status:response.status,errorData:JSON.stringify(errorData)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
    // #endregion
    throw new Error(errorData.error || `Failed to start analysis: ${response.status}`);
  }

  const result = await response.json();
  return {
    jobId: result.jobId,
    status: result.status || 'queued',
  };
}

/**
 * Polls job status with exponential backoff
 * @param jobId - The job ID to poll
 * @param onStatusUpdate - Callback for status updates
 * @param maxAttempts - Maximum number of polling attempts (default: 60)
 * @param initialInterval - Initial polling interval in ms (default: 2000)
 * @returns Final job status
 */
export async function pollJobStatus(
  jobId: string,
  onStatusUpdate?: (status: JobStatus) => void,
  maxAttempts: number = 60,
  initialInterval: number = 2000
): Promise<JobStatus> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Authentication required. Please log in and try again.');
  }

  let attempt = 0;
  let interval = initialInterval;
  const maxInterval = 10000; // Max 10 seconds between polls

  while (attempt < maxAttempts) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/get-job-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({ jobId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get job status: ${response.status}`);
      }

      const status: JobStatus = await response.json();

      // Call update callback
      onStatusUpdate?.(status);

      // If job is done or failed, stop polling
      if (status.status === 'done' || status.status === 'failed') {
        return status;
      }

      // Exponential backoff: increase interval up to max
      interval = Math.min(interval * 1.5, maxInterval);
      attempt++;

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, interval));

    } catch (error: any) {
      console.error(`Polling attempt ${attempt + 1} failed:`, error);
      attempt++;

      // On error, wait a bit longer before retrying
      await new Promise(resolve => setTimeout(resolve, interval * 2));

      // If max attempts reached, throw error
      if (attempt >= maxAttempts) {
        throw new Error(`Failed to poll job status after ${maxAttempts} attempts: ${error.message}`);
      }
    }
  }

  throw new Error(`Job status polling timed out after ${maxAttempts} attempts`);
}

/**
 * Gets current job status (single request, no polling)
 * @param jobId - The job ID
 * @returns Current job status
 */
export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Authentication required. Please log in and try again.');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/get-job-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': supabaseKey,
    },
    body: JSON.stringify({ jobId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to get job status: ${response.status}`);
  }

  return await response.json();
}

