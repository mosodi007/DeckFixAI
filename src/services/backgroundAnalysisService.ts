import { supabase } from './analysisService';
import { v4 as uuidv4 } from 'uuid';
import { 
  saveUploadState, 
  updateUploadState, 
  removeUploadState, 
  getUploadState,
  isOnline,
  onNetworkStatusChange,
  PersistedUploadState
} from './uploadPersistenceService';

export interface AnalysisStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string | null;
}

export interface AnalysisProgress {
  currentPage: number;
  totalPages: number;
  status: 'extracting' | 'analyzing' | 'finalizing';
}

/**
 * Creates an analysis record in the database with 'pending' status
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

  console.log('Analysis record created:', analysisId);
  return analysisId;
}

/**
 * Analyzes a single page using the analyze-page Edge Function with retry logic
 * Handles rate limits (429) with exponential backoff
 */
async function analyzePage(
  analysisId: string,
  pageNumber: number,
  imageUrl: string,
  accessToken: string,
  supabaseUrl: string,
  supabaseKey: string,
  retries: number = 3
): Promise<{ success: boolean; content?: string }> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          analysisId,
          pageNumber,
          imageUrl,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        const errorMessage = errorData.error || `HTTP ${response.status}`;
        
        // Check if it's a rate limit error (429)
        if (response.status === 429 || errorMessage.includes('429') || errorMessage.includes('rate limit')) {
          // For rate limits, use longer backoff
          const rateLimitDelay = Math.min(60000 * Math.pow(2, attempt - 1), 300000); // 1min, 2min, 4min, max 5min
          if (attempt < retries) {
            console.log(`Rate limit hit for page ${pageNumber}, waiting ${Math.round(rateLimitDelay / 1000)}s before retry ${attempt + 1}/${retries}...`);
            await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
            continue;
          }
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      return { success: result.success, content: result.content };
      
    } catch (error: any) {
      lastError = error;
      
      // Only log errors on last attempt or if not rate limit
      const isRateLimit = error.message?.includes('429') || error.message?.includes('rate limit');
      if (attempt === retries || !isRateLimit) {
        if (isRateLimit) {
          console.error(`Page ${pageNumber} failed after ${retries} attempts: Rate limit exceeded`);
        } else {
          console.error(`Page ${pageNumber} failed:`, error.message);
        }
      }
      
      // If it's the last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      // Longer delay for rate limits
      const isRateLimitError = error.message?.includes('429') || error.message?.includes('rate limit');
      const baseDelay = isRateLimitError ? 30000 : 2000; // 30s for rate limits, 2s for others
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), isRateLimitError ? 300000 : 10000);
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error(`Failed to analyze page ${pageNumber} after ${retries} attempts`);
}

/**
 * Finalizes the analysis by generating comprehensive summary
 */
async function finalizeAnalysis(
  analysisId: string,
  accessToken: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<void> {
  const response = await fetch(`${supabaseUrl}/functions/v1/finalize-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': supabaseKey,
    },
    body: JSON.stringify({ analysisId }),
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      const errorText = await response.text().catch(() => 'Unknown error');
      errorData = { error: errorText };
    }
    
    // Only log non-rate-limit errors
    const isRateLimit = response.status === 429 || errorData.error?.includes('429') || errorData.error?.includes('rate limit');
    if (!isRateLimit) {
      console.error('Finalize-analysis error:', errorData.error || errorData);
    }
    throw new Error(errorData.error || `Failed to finalize analysis: ${response.status}`);
  }

  const result = await response.json();
  // Only log on success, not the full result
  if (result.success) {
    console.log('Finalization completed successfully');
  }
}

/**
 * Resumes analysis from where it left off
 * Checks if images are already uploaded and continues from the last analyzed page
 */
export async function resumeBackgroundAnalysis(
  analysisId: string,
  userId: string,
  fileName: string,
  fileSize: number,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<void> {
  const persistedState = getUploadState(analysisId);
  
  if (!persistedState) {
    throw new Error('No persisted state found for this analysis');
  }

  // Check database status first
  const { data: analysis } = await supabase
    .from('analyses')
    .select('status, total_pages')
    .eq('id', analysisId)
    .single();

  if (!analysis) {
    throw new Error('Analysis not found');
  }

  // If already completed, clean up and return
  if (analysis.status === 'completed') {
    removeUploadState(analysisId);
    return;
  }

  // Check which pages have been analyzed
  const { data: analyzedPages } = await supabase
    .from('analysis_pages')
    .select('page_number')
    .eq('analysis_id', analysisId);

  const analyzedPageNumbers = new Set(analyzedPages?.map(p => p.page_number) || []);
  
  // Get image URLs from storage - first list files to check what exists
  const imageUrls: string[] = [];
  const totalPages = persistedState.totalPages || analysis.total_pages;
  
  // List existing files first
  const { data: existingFiles, error: listError } = await supabase.storage
    .from('slide-images')
    .list(analysisId);
  
  if (listError) {
    console.error('Error listing files:', listError);
    throw new Error(`Failed to list images: ${listError.message}`);
  }
  
  // Create signed URLs only for files that exist
  for (let i = 1; i <= totalPages; i++) {
    const fileName = `page_${i}.jpg`;
    const fileExists = existingFiles?.some(f => f.name === fileName);
    
    if (fileExists) {
      const fullPath = `${analysisId}/${fileName}`;
      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from('slide-images')
        .createSignedUrl(fullPath, 3600);
      
      if (!signedError && signedUrlData?.signedUrl) {
        imageUrls.push(signedUrlData.signedUrl);
      } else {
        console.warn(`Failed to create signed URL for ${fullPath}:`, signedError);
      }
    } else {
      console.warn(`Image ${fileName} not found in storage`);
    }
  }
  
  if (imageUrls.length === 0) {
    throw new Error('No images found in storage. Please re-upload.');
  }

  if (imageUrls.length === 0) {
    throw new Error('No images found in storage. Please re-upload.');
  }

  // Continue analysis from where it left off
  await continueAnalysisFromPage(
    analysisId,
    imageUrls,
    analyzedPageNumbers,
    persistedState,
    onProgress
  );
}

/**
 * Continues analysis from a specific point
 */
async function continueAnalysisFromPage(
  analysisId: string,
  imageUrls: string[],
  analyzedPageNumbers: Set<number>,
  persistedState: PersistedUploadState,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Get fresh session
  let { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session?.access_token) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session?.access_token) {
      throw new Error('Authentication required. Please log in and try again.');
    }
    session = refreshData.session;
  }

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error('No access token available');
  }

  const totalPages = imageUrls.length;
  const failedPages: number[] = [];

  // Update status to processing
  await supabase
    .from('analyses')
    .update({ status: 'processing' })
    .eq('id', analysisId);

  // Analyze only pages that haven't been analyzed yet
  for (let i = 0; i < imageUrls.length; i++) {
    const pageNumber = i + 1;
    
    // Skip if already analyzed (only log for first few or last)
    if (analyzedPageNumbers.has(pageNumber)) {
      if (pageNumber <= 3 || pageNumber === totalPages) {
        console.log(`Skipping page ${pageNumber} - already analyzed`);
      }
      continue;
    }

    // Wait for network if offline
    if (!isOnline()) {
      console.log('Network offline, waiting...');
      await new Promise<void>((resolve) => {
        const unsubscribe = onNetworkStatusChange((online) => {
          if (online) {
            unsubscribe();
            resolve();
          }
        });
        // Timeout after 5 minutes
        setTimeout(() => {
          unsubscribe();
          resolve();
        }, 5 * 60 * 1000);
      });
    }

    try {
      if (onProgress) {
        onProgress({
          currentPage: pageNumber,
          totalPages,
          status: 'analyzing',
        });
      }

      updateUploadState(analysisId, {
        status: 'analyzing',
        analyzedPageCount: analyzedPageNumbers.size + (i - analyzedPageNumbers.size),
      });

      // Only log every 5 pages to reduce noise
      if (pageNumber % 5 === 0 || pageNumber === 1 || pageNumber === totalPages) {
        console.log(`Resuming: Analyzing page ${pageNumber}/${totalPages}...`);
      }
      
      await analyzePage(analysisId, pageNumber, imageUrls[i], accessToken, supabaseUrl, supabaseKey, 3);
      
      // Only log completion for important pages
      if (pageNumber % 5 === 0 || pageNumber === totalPages) {
        console.log(`Page ${pageNumber} completed`);
      }
      
      // Longer delay between pages to avoid rate limits (2 seconds)
      if (i < imageUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error: any) {
      // Only log if it's not a rate limit (those are handled in analyzePage)
      const isRateLimit = error.message?.includes('429') || error.message?.includes('rate limit');
      if (!isRateLimit) {
        console.error(`Failed to analyze page ${pageNumber}:`, error.message);
      }
      failedPages.push(pageNumber);
      
      // Wait longer before continuing to next page if we hit rate limit
      if (isRateLimit && i < imageUrls.length - 1) {
        console.log('Rate limit detected, waiting 30s before continuing...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
  }

  // Finalize if we have analyzed pages
  if (analyzedPageNumbers.size + (totalPages - failedPages.length - analyzedPageNumbers.size) > 0) {
    try {
      if (onProgress) {
        onProgress({
          currentPage: totalPages,
          totalPages,
          status: 'finalizing',
        });
      }

      updateUploadState(analysisId, { status: 'finalizing' });

      await finalizeAnalysis(analysisId, accessToken, supabaseUrl, supabaseKey);
      
      updateUploadState(analysisId, { status: 'completed' });
      removeUploadState(analysisId);
    } catch (error: any) {
      console.error('Finalization error:', error);
      updateUploadState(analysisId, { 
        status: 'failed', 
        error: error.message 
      });
    }
  }
}

/**
 * Starts sequential background analysis - one page at a time
 */
export async function startBackgroundAnalysis(
  file: File,
  analysisId: string,
  imageUrls: string[],
  onProgress?: (progress: AnalysisProgress) => void
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('No image URLs provided for analysis');
  }

  const totalPages = imageUrls.length;
  console.log(`Starting sequential analysis for ${totalPages} pages...`);

  // Get fresh session
  let { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session?.access_token) {
    // Try to refresh
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session?.access_token) {
      throw new Error('Authentication required. Please log in and try again.');
    }
    session = refreshData.session;
  }

  const accessToken = session?.access_token;
  
  if (!accessToken) {
    throw new Error('No access token available');
  }

  // Deduct credits upfront
  const creditCost = totalPages;
  try {
    const { error: deductError } = await supabase.rpc('deduct_credits', {
      p_user_id: session.user.id,
      p_amount: creditCost,
      p_description: `Analysis: ${file.name} (${totalPages} pages)`,
      p_metadata: { analysisId, pageCount: totalPages, fileName: file.name },
    });

    if (deductError) {
      throw new Error(`Failed to deduct credits: ${deductError.message}`);
    }
    console.log(`Deducted ${creditCost} credits for analysis`);
  } catch (creditError: any) {
    await supabase
      .from('analyses')
      .update({ status: 'failed', error_message: creditError.message })
      .eq('id', analysisId);
    throw creditError;
  }

  // Save initial state
  saveUploadState({
    analysisId,
    fileName: file.name,
    fileSize: file.size,
    totalPages,
    userId: session.user.id,
    imageUrls,
    uploadedImageCount: imageUrls.length,
    analyzedPageCount: 0,
    status: 'analyzing',
    timestamp: Date.now(),
  });

  // Update status to processing
  await supabase
    .from('analyses')
    .update({ status: 'processing' })
    .eq('id', analysisId);

  // Analyze each page sequentially
  const failedPages: number[] = [];
  
  for (let i = 0; i < imageUrls.length; i++) {
    const pageNumber = i + 1;
    const imageUrl = imageUrls[i];

    // Wait for network if offline
    if (!isOnline()) {
      console.log('Network offline, waiting...');
      await new Promise<void>((resolve) => {
        const unsubscribe = onNetworkStatusChange((online) => {
          if (online) {
            unsubscribe();
            resolve();
          }
        });
        // Timeout after 5 minutes
        setTimeout(() => {
          unsubscribe();
          resolve();
        }, 5 * 60 * 1000);
      });
    }

    try {
      // Update progress
      if (onProgress) {
        onProgress({
          currentPage: pageNumber,
          totalPages,
          status: 'analyzing',
        });
      }

      // Update persisted state
      updateUploadState(analysisId, {
        analyzedPageCount: i,
        status: 'analyzing',
      });

      // Only log every 5 pages to reduce noise
      if (pageNumber % 5 === 0 || pageNumber === 1 || pageNumber === totalPages) {
        console.log(`Analyzing page ${pageNumber}/${totalPages}...`);
      }
      
      await analyzePage(analysisId, pageNumber, imageUrl, accessToken, supabaseUrl, supabaseKey, 3);
      
      // Only log completion for important pages
      if (pageNumber % 5 === 0 || pageNumber === totalPages) {
        console.log(`Page ${pageNumber} completed`);
      }
      
      // Update persisted state after successful analysis
      updateUploadState(analysisId, {
        analyzedPageCount: i + 1,
      });
      
      // Longer delay between pages to avoid rate limits (2 seconds)
      if (i < imageUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error: any) {
      // Only log if it's not a rate limit (those are handled in analyzePage)
      const isRateLimit = error.message?.includes('429') || error.message?.includes('rate limit');
      if (!isRateLimit) {
        console.error(`Failed to analyze page ${pageNumber}:`, error.message);
      }
      failedPages.push(pageNumber);
      
      // Save error state but continue
      updateUploadState(analysisId, {
        error: `Failed on page ${pageNumber}: ${error.message}`,
      });
      
      // Wait longer before continuing to next page if we hit rate limit
      if (isRateLimit && i < imageUrls.length - 1) {
        console.log('Rate limit detected, waiting 30s before continuing...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
      
      // Continue with other pages even if one fails
      // We'll refund credits for failed pages at the end
    }
  }

  // If all pages failed, mark as failed and refund
  if (failedPages.length === totalPages) {
    await supabase
      .from('analyses')
      .update({ 
        status: 'failed', 
        error_message: `Failed to analyze all pages` 
      })
      .eq('id', analysisId);
    
    // Refund credits
    try {
      await supabase.rpc('add_credits', {
        p_user_id: session.user.id,
        p_amount: creditCost,
        p_description: `Refund for failed analysis`,
        p_metadata: { analysisId, type: 'refund' },
      });
    } catch (refundError) {
      console.error('Failed to refund credits:', refundError);
    }
    
    throw new Error('Failed to analyze all pages');
  }

  // If some pages failed, log but continue
  if (failedPages.length > 0) {
    console.warn(`Warning: ${failedPages.length} pages failed to analyze:`, failedPages);
    // Refund credits for failed pages
    try {
      await supabase.rpc('add_credits', {
        p_user_id: session.user.id,
        p_amount: failedPages.length,
        p_description: `Refund for ${failedPages.length} failed pages`,
        p_metadata: { analysisId, type: 'refund', failedPages },
      });
    } catch (refundError) {
      console.error('Failed to refund credits for failed pages:', refundError);
    }
  }

  // Finalize analysis - generate comprehensive summary
  // Even if some pages failed, we should still finalize with the pages we have
  try {
    if (onProgress) {
      onProgress({
        currentPage: totalPages,
        totalPages,
        status: 'finalizing',
      });
    }

    updateUploadState(analysisId, { status: 'finalizing' });

    console.log(`Finalizing analysis with ${totalPages - failedPages.length} successful pages...`);
    
    // Check if already completed before finalizing (to prevent duplicate calls)
    const { data: statusCheck } = await supabase
      .from('analyses')
      .select('status')
      .eq('id', analysisId)
      .single();
    
    if (statusCheck?.status === 'completed') {
      console.log('Analysis already completed, skipping finalization');
      updateUploadState(analysisId, { status: 'completed' });
      removeUploadState(analysisId);
      return;
    }

    // Retry finalization up to 3 times with rate limit handling
    let finalizationError: Error | null = null;
    let finalizationSuccess = false;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Check status again before each attempt
        const { data: preCheck } = await supabase
          .from('analyses')
          .select('status')
          .eq('id', analysisId)
          .single();
        
        if (preCheck?.status === 'completed') {
          console.log('Analysis completed by another process, skipping finalization');
          finalizationSuccess = true;
          break;
        }
        
        await finalizeAnalysis(analysisId, accessToken, supabaseUrl, supabaseKey);
        console.log('Analysis completed successfully!');
        finalizationError = null;
        finalizationSuccess = true;
        
        // Mark as completed in persisted state
        updateUploadState(analysisId, { status: 'completed' });
        removeUploadState(analysisId);
        
        // Wait a moment for database to update, then verify status
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verify status was updated
        const { data: verifyData } = await supabase
          .from('analyses')
          .select('status')
          .eq('id', analysisId)
          .single();
        
        if (verifyData?.status === 'completed') {
          break;
        } else {
          if (attempt < 3) {
            console.log(`Status verification failed, retrying finalization (attempt ${attempt + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          }
        }
      } catch (error: any) {
        finalizationError = error;
        const isRateLimit = error.message?.includes('429') || error.message?.includes('rate limit');
        
        if (isRateLimit) {
          const rateLimitDelay = Math.min(60000 * Math.pow(2, attempt - 1), 300000); // 1min, 2min, 4min, max 5min
          console.log(`Finalization rate limited, waiting ${Math.round(rateLimitDelay / 1000)}s before retry ${attempt + 1}/3...`);
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
            continue;
          }
        } else {
          if (attempt < 3) {
            console.log(`Finalization error, retrying (attempt ${attempt + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
          }
        }
      }
    }
    
    if (!finalizationSuccess && finalizationError) {
      throw finalizationError;
    }
    
    if (finalizationError) {
      // Even if finalization fails, mark as completed if we have pages
      const { data: pages } = await supabase
        .from('analysis_pages')
        .select('id')
        .eq('analysis_id', analysisId)
        .limit(1);
      
      if (pages && pages.length > 0) {
        // We have at least some pages, mark as completed with a warning
        await supabase
          .from('analyses')
          .update({ 
            status: 'completed',
            summary: 'Analysis completed with some limitations. Some pages may be missing.',
            error_message: `Finalization had issues but pages were analyzed: ${finalizationError.message}`
          })
          .eq('id', analysisId);
        console.log('Marked analysis as completed despite finalization issues');
      } else {
        // No pages at all, mark as failed
        await supabase
          .from('analyses')
          .update({ 
            status: 'failed', 
            error_message: `Finalization failed and no pages were analyzed: ${finalizationError.message}` 
          })
          .eq('id', analysisId);
        throw finalizationError;
      }
    }
  } catch (error: any) {
    console.error('Critical error during finalization:', error);
    // Last resort: try to mark as completed if we have any pages
    const { data: pages } = await supabase
      .from('analysis_pages')
      .select('id')
      .eq('analysis_id', analysisId)
      .limit(1);
    
    if (pages && pages.length > 0) {
      await supabase
        .from('analyses')
        .update({ 
          status: 'completed',
          summary: 'Analysis completed with limitations.',
          error_message: error.message
        })
        .eq('id', analysisId);
    } else {
      await supabase
        .from('analyses')
        .update({ 
          status: 'failed', 
          error_message: error.message 
        })
        .eq('id', analysisId);
      throw error;
    }
  }
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
