import { supabase } from './analysisService';
import { v4 as uuidv4 } from 'uuid';
import { uploadPdfFile } from './storageService';

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
 * 
 * Instead of sending the file in the request body (which can cause size limit issues),
 * we upload the PDF to storage first and send only the URL
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

  // OPTIMIZATION: Skip PDF upload if we have image URLs
  // The Edge Function skips PDF download when image URLs are provided, so we don't need to upload the PDF
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundAnalysisService.ts:64',message:'Checking if PDF upload needed',data:{analysisId,fileName:file.name,fileSize:file.size,imageUrlsCount:imageUrls.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C,D'})}).catch(()=>{});
  // #endregion
  let pdfUrl: string | null = null;
  
  if (imageUrls && imageUrls.length > 0) {
    // We have images, skip PDF upload - Edge Function will use images directly
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundAnalysisService.ts:69',message:'Skipping PDF upload - using image URLs',data:{imageUrlsCount:imageUrls.length,savedBytes:file.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C,D'})}).catch(()=>{});
    // #endregion
    console.log(`OPTIMIZATION: Skipping PDF upload - using ${imageUrls.length} image URLs (saves ${Math.round(file.size / 1024)}KB upload)`);
  } else {
    // No images, we need the PDF for text extraction fallback
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundAnalysisService.ts:72',message:'No image URLs - uploading PDF',data:{analysisId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
    // #endregion
    console.log('Uploading PDF file to storage (no image URLs provided)...');
    try {
      pdfUrl = await uploadPdfFile(file, analysisId);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundAnalysisService.ts:75',message:'PDF upload completed',data:{pdfUrlLength:pdfUrl.length,pdfUrlPreview:pdfUrl.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C,D'})}).catch(()=>{});
      // #endregion
      console.log('PDF file uploaded, signed URL created');
    } catch (uploadError: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundAnalysisService.ts:78',message:'PDF upload failed',data:{error:uploadError.message,stack:uploadError.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
      // #endregion
      throw uploadError;
    }
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundAnalysisService.ts:85',message:'Before creating payload',data:{hasPdfUrl:!!pdfUrl,imageUrlsCount:imageUrls.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  // Send JSON payload instead of FormData to avoid size limits
  const payload = {
    analysisId,
    pdfUrl: pdfUrl || null, // Signed URL to the PDF in storage (null if using images only)
    imageUrls, // Array of signed URLs to page images
    fileName: file.name,
    fileSize: file.size,
  };

  // Get session and refresh if needed
  let { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  console.log('Session check:', {
    hasSession: !!session,
    hasAccessToken: !!session?.access_token,
    expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
    sessionError: sessionError?.message
  });
  
  // Check if session is expired or about to expire (within 2 minutes)
  let needsRefresh = false;
  if (session?.expires_at) {
    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    console.log(`Session expiry check: ${Math.round(timeUntilExpiry / 1000)}s until expiry`);
    
    // Refresh if expired or expires within 2 minutes
    if (timeUntilExpiry < 120000) {
      needsRefresh = true;
      console.log('Session needs refresh - refreshing now...');
    }
  } else if (!session) {
    needsRefresh = true;
    console.log('No session found - attempting refresh...');
  }

  // Refresh session if needed
  if (needsRefresh) {
    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshData.session) {
        session = refreshData.session;
        console.log('Session refreshed successfully');
      } else {
        console.error('Failed to refresh session:', refreshError);
        if (!session) {
          throw new Error('No active session. Please log in and try again.');
        }
      }
    } catch (refreshErr: any) {
      console.error('Error refreshing session:', refreshErr);
      if (!session) {
        throw new Error('Session expired. Please log in and try again.');
      }
    }
  }

  if (!session?.access_token) {
    console.error('No access token available. Session:', session);
    throw new Error('Authentication required. Please log in and try again.');
  }

  console.log('Authorization header will be set, token length:', session.access_token.length);

  const headers: Record<string, string> = {
    'apikey': supabaseKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
  
  console.log('Request headers:', {
    hasApikey: !!headers.apikey,
    hasContentType: !!headers['Content-Type'],
    hasAuthorization: !!headers.Authorization,
    authHeaderLength: headers.Authorization?.length || 0
  });

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundAnalysisService.ts:151',message:'Before fetch to Edge Function',data:{url:`${supabaseUrl}/functions/v1/analyze-deck`,payloadSize:JSON.stringify(payload).length,hasPdfUrl:!!payload.pdfUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,D,E'})}).catch(()=>{});
  // #endregion
  // Fire and forget - don't await the response
  // The Edge Function will update the status in the database
  const fetchStartTime = Date.now();
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundAnalysisService.ts:156',message:'Initiating fetch request',data:{url:`${supabaseUrl}/functions/v1/analyze-deck`,method:'POST',hasHeaders:true,payloadSize:JSON.stringify(payload).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  // Create abort controller for timeout
  // Supabase Edge Functions have a max execution time (usually 5-10 minutes depending on plan)
  // For 20 images processed sequentially, we need at least 10 minutes
  // Each image takes ~10-30 seconds + 500ms delay = ~4-6 minutes minimum for 20 images
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, 600000); // 10 minutes - increased to handle sequential processing of 20 images
  
  fetch(`${supabaseUrl}/functions/v1/analyze-deck`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: abortController.signal,
  })
    .then(async (response) => {
      clearTimeout(timeoutId); // Clear timeout on successful response
      const fetchDuration = Date.now() - fetchStartTime;
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundAnalysisService.ts:167',message:'Edge Function response received',data:{status:response.status,statusText:response.statusText,ok:response.ok,fetchDuration},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          const errorText = await response.text().catch(() => 'Unknown error');
          errorData = { error: errorText };
        }
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundAnalysisService.ts:172',message:'Edge Function error response',data:{status:response.status,error:JSON.stringify(errorData),fetchDuration},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.error('Background analysis failed:', errorData);
        
        // Update status to failed
        await supabase
          .from('analyses')
          .update({
            status: 'failed',
            error_message: errorData.error || errorData.message || 'Analysis failed',
          })
          .eq('id', analysisId);
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundAnalysisService.ts:183',message:'Edge Function success',data:{analysisId,fetchDuration},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.log('Background analysis started successfully for:', analysisId);
      }
    })
    .catch(async (error) => {
      const fetchDuration = Date.now() - fetchStartTime;
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundAnalysisService.ts:189',message:'Fetch catch error',data:{error:error.message,errorName:error.name,errorStack:error.stack,fetchDuration,isTimeout:error.name==='TimeoutError'||error.name==='AbortError'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.error('Failed to start background analysis:', error);
      
      // Update status to failed
      await supabase
        .from('analyses')
        .update({
          status: 'failed',
          error_message: error.name === 'TimeoutError' || error.name === 'AbortError' 
            ? 'Analysis request timed out. The analysis may still be processing in the background.'
            : error.message || 'Failed to start analysis',
        })
        .eq('id', analysisId);
    });

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d8351f7d-e310-420e-b1b5-98ae441a8f6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backgroundAnalysisService.ts:186',message:'Request sent (fire and forget)',data:{analysisId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
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

