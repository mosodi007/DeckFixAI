/**
 * Upload Persistence Service
 * Handles persisting upload state to localStorage and resuming uploads
 */

export interface PersistedUploadState {
  analysisId: string;
  fileName: string;
  fileSize: number;
  totalPages: number;
  userId: string;
  imageUrls: string[];
  uploadedImageCount: number;
  analyzedPageCount: number;
  status: 'extracting' | 'uploading' | 'analyzing' | 'finalizing' | 'completed' | 'failed';
  timestamp: number;
  error?: string;
}

const STORAGE_KEY_PREFIX = 'deckfix_upload_';
const MAX_STORAGE_AGE = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save upload state to localStorage
 */
export function saveUploadState(state: PersistedUploadState): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${state.analysisId}`;
    localStorage.setItem(key, JSON.stringify({
      ...state,
      timestamp: Date.now(),
    }));
    console.log(`Saved upload state for ${state.analysisId}`);
  } catch (error) {
    console.error('Failed to save upload state:', error);
  }
}

/**
 * Get upload state from localStorage
 */
export function getUploadState(analysisId: string): PersistedUploadState | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${analysisId}`;
    const data = localStorage.getItem(key);
    if (!data) return null;

    const state = JSON.parse(data) as PersistedUploadState;
    
    // Check if state is too old
    const age = Date.now() - state.timestamp;
    if (age > MAX_STORAGE_AGE) {
      localStorage.removeItem(key);
      return null;
    }

    return state;
  } catch (error) {
    console.error('Failed to get upload state:', error);
    return null;
  }
}

/**
 * Get all active upload states
 */
export function getAllActiveUploadStates(): PersistedUploadState[] {
  const states: PersistedUploadState[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const state = JSON.parse(data) as PersistedUploadState;
            const age = Date.now() - state.timestamp;
            
            // Only return states that are not too old and not completed
            if (age <= MAX_STORAGE_AGE && state.status !== 'completed' && state.status !== 'failed') {
              states.push(state);
            } else if (age > MAX_STORAGE_AGE || state.status === 'completed' || state.status === 'failed') {
              // Clean up old or completed states
              localStorage.removeItem(key);
            }
          } catch (e) {
            // Invalid data, remove it
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to get all upload states:', error);
  }

  return states;
}

/**
 * Update upload state
 */
export function updateUploadState(
  analysisId: string,
  updates: Partial<PersistedUploadState>
): void {
  const current = getUploadState(analysisId);
  if (current) {
    saveUploadState({
      ...current,
      ...updates,
      timestamp: Date.now(),
    });
  }
}

/**
 * Remove upload state (when completed or failed)
 */
export function removeUploadState(analysisId: string): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${analysisId}`;
    localStorage.removeItem(key);
    console.log(`Removed upload state for ${analysisId}`);
  } catch (error) {
    console.error('Failed to remove upload state:', error);
  }
}

/**
 * Check if network is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for network status changes
 */
export function onNetworkStatusChange(callback: (isOnline: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

