import { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, AlertCircle, Calendar, ChevronRight, Upload, Trash2, Mail, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/analysisService';
import { ScoreCircle } from './ScoreCircle';
import { extractPageImages } from '../services/pdfImageExtractor';
import { uploadPageImages, deleteAnalysisImages, getCoverImageUrl } from '../services/storageService';
import { sendVerificationEmail, isEmailVerified } from '../services/emailVerificationService';
import { AuthenticatedUploader } from './AuthenticatedUploader';
import { createAnalysisRecord, startBackgroundAnalysis, resumeBackgroundAnalysis, AnalysisProgress } from '../services/backgroundAnalysisService';
import { normalizeScoreTo0To10, formatScoreWithSuffix } from '../utils/scoreUtils';
import { getAllActiveUploadStates, removeUploadState } from '../services/uploadPersistenceService';

interface DeckAnalysis {
  id: string;
  deck_name: string;
  overall_score: number;
  total_pages: number;
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  key_strengths?: string[];
  critical_issues_count?: number;
}

interface DashboardViewProps {
  onViewAnalysis: (analysisId: string) => void;
  onNewUpload: () => void;
}

export function DashboardView({ onViewAnalysis, onNewUpload }: DashboardViewProps) {
  const { user } = useAuth();
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [analyses, setAnalyses] = useState<DeckAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [showVerificationBanner, setShowVerificationBanner] = useState(true);
  
  // Persist uploader state in localStorage
  const getInitialUploaderState = () => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('deckfix_show_uploader');
    if (saved === 'true') return true;
    
    // Also check if there are active uploads - if so, show uploader
    const activeUploads = getAllActiveUploadStates();
    if (activeUploads.length > 0 && user) {
      const userUploads = activeUploads.filter(u => u.userId === user.id);
      if (userUploads.length > 0) {
        // Check if any are still in progress
        return userUploads.some(u => 
          u.status === 'extracting' || 
          u.status === 'uploading' || 
          u.status === 'analyzing' || 
          u.status === 'finalizing'
        );
      }
    }
    return false;
  };
  
  const [showUploader, setShowUploader] = useState(getInitialUploaderState);

  // Persist uploader state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (showUploader) {
        localStorage.setItem('deckfix_show_uploader', 'true');
      } else {
        localStorage.removeItem('deckfix_show_uploader');
      }
    }
  }, [showUploader]);

  useEffect(() => {
    loadAnalyses();
    checkEmailVerification();
    checkAndResumeIncompleteUploads();
    
    // Check for active uploads and show uploader if needed
    const checkActiveUploads = () => {
      if (!user) return;
      const activeUploads = getAllActiveUploadStates();
      const userUploads = activeUploads.filter(u => u.userId === user.id);
      if (userUploads.length > 0) {
        const hasActiveUpload = userUploads.some(u => 
          u.status === 'extracting' || 
          u.status === 'uploading' || 
          u.status === 'analyzing' || 
          u.status === 'finalizing'
        );
        if (hasActiveUpload && !showUploader) {
          setShowUploader(true);
        }
      }
    };
    
    checkActiveUploads();
    
    // Also check when page regains focus
    const handleFocus = () => {
      checkActiveUploads();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  // Check for incomplete uploads and resume them in background
  const checkAndResumeIncompleteUploads = async () => {
    if (!user) return;

    const activeUploads = getAllActiveUploadStates();
    
    for (const uploadState of activeUploads) {
      // Only resume uploads for current user
      if (uploadState.userId !== user.id) continue;

      // Check database status
      const { data: analysis } = await supabase
        .from('analyses')
        .select('status')
        .eq('id', uploadState.analysisId)
        .single();

      if (!analysis) {
        // Analysis doesn't exist, clean up
        removeUploadState(uploadState.analysisId);
        continue;
      }

      if (analysis.status === 'completed') {
        // Already completed, clean up
        removeUploadState(uploadState.analysisId);
        continue;
      }

      // Resume the upload in background (don't show UI)
      resumeBackgroundAnalysis(
        uploadState.analysisId,
        uploadState.userId,
        uploadState.fileName,
        uploadState.fileSize
      ).catch((error) => {
        console.error('Failed to resume upload in background:', error);
      });
    }
  };

  // Reload analyses when upload completes (for cases where analysis is still processing)
  const handleUploadComplete = () => {
    setShowUploader(false);
    // Reload analyses to show updated status
    loadAnalyses(true);
  };

  const checkEmailVerification = async () => {
    if (user) {
      // Check if user signed up via Google OAuth (Google users are always verified)
      // Access provider from app_metadata or raw_app_meta_data
      const userMetadata = (user as any).app_metadata || (user as any).raw_app_meta_data || {};
      const isGoogleOAuth = userMetadata?.provider === 'google';
      
      if (isGoogleOAuth) {
        setEmailVerified(true); // Google OAuth users don't need verification
        return;
      }

      // For email/password signups, check verification status
      const verified = await isEmailVerified();
      setEmailVerified(verified);
    }
  };

  const handleSendVerificationEmail = async () => {
    setSendingVerification(true);
    setVerificationMessage(null);
    
    const result = await sendVerificationEmail();
    
    if (result.success) {
      setVerificationMessage('Verification email sent! Please check your inbox.');
    } else {
      setVerificationMessage(result.error || 'Failed to send verification email. Please try again.');
    }
    
    setSendingVerification(false);
    
    // Clear message after 5 seconds
    setTimeout(() => {
      setVerificationMessage(null);
    }, 5000);
  };

  // Poll for verification status update after sending email
  useEffect(() => {
    if (verificationMessage && verificationMessage.includes('sent')) {
      const pollInterval = setInterval(async () => {
        await checkEmailVerification();
        // If verified, stop polling and hide banner
        const verified = await isEmailVerified();
        if (verified) {
          setEmailVerified(true);
          setShowVerificationBanner(false);
          clearInterval(pollInterval);
        }
      }, 3000); // Check every 3 seconds

      // Stop polling after 5 minutes
      const timeout = setTimeout(() => {
        clearInterval(pollInterval);
      }, 300000);

      return () => {
        clearInterval(pollInterval);
        clearTimeout(timeout);
      };
    }
  }, [verificationMessage]);

  // Check for verification status when URL has verified=true
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const verified = urlParams.get('verified');
    
    if (verified === 'true' && user) {
      // User just verified their email, refresh status
      checkEmailVerification().then(() => {
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      });
    }
  }, [user]);

  // Memoize pending/processing analyses to prevent unnecessary re-renders
  const pendingOrProcessingAnalyses = useMemo(() => {
    return analyses.filter(a => a.status === 'pending' || a.status === 'processing');
  }, [analyses]);

  // Open uploader by default when there are no decks (only on initial load)
  useEffect(() => {
    if (!loading && analyses.length === 0 && !showUploader) {
      // Check if user has explicitly closed it before
      // Only auto-open if this is the first time (no explicit close preference)
      const explicitlyClosed = localStorage.getItem('deckfix_uploader_closed');
      
      // Only auto-open if not explicitly closed by user
      if (!explicitlyClosed) {
        setShowUploader(true);
      }
    }
  }, [analyses.length, loading, showUploader]);

  // Poll for status updates on pending/processing analyses
  useEffect(() => {
    if (pendingOrProcessingAnalyses.length === 0) {
      return; // No need to poll if no pending/processing analyses
    }

    const pollInterval = setInterval(() => {
      // Reload analyses silently (without showing main loader)
      loadAnalyses(true);
    }, 2500); // Poll every 2.5 seconds

    return () => {
      clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOrProcessingAnalyses.length]);

  async function loadAnalyses(silent = false) {
    try {
      if (!silent) {
        setLoading(true);
      }

      let query = supabase
        .from('analyses')
        .select(`
          id,
          file_name,
          overall_score,
          total_pages,
          created_at,
          status
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const formattedAnalyses: DeckAnalysis[] = (data || []).map(item => ({
        id: item.id,
        deck_name: item.file_name || 'Untitled Deck',
        overall_score: item.overall_score || 0,
        total_pages: item.total_pages || 0,
        created_at: item.created_at,
        status: (item.status || 'completed') as 'pending' | 'processing' | 'completed' | 'failed',
        critical_issues_count: 0,
      }));

      setAnalyses(formattedAnalyses);
      
      // If no decks exist, open uploader by default
      if (!silent && formattedAnalyses.length === 0 && !showUploader) {
        setShowUploader(true);
      }
    } catch (error) {
      console.error('Error loading analyses:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function handleDelete(analysisId: string, deckName: string) {
    if (!confirm(`Are you sure you want to delete "${deckName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(analysisId);

      await deleteAnalysisImages(analysisId);

      const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('id', analysisId);

      if (error) throw error;

      setAnalyses(prev => prev.filter(a => a.id !== analysisId));
    } catch (error) {
      console.error('Error deleting analysis:', error);
      alert('Failed to delete analysis. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      handleUpload(file);
    } else {
      alert('Please select a PDF file');
    }
  }

  function handleChooseFile() {
    fileInputRef.current?.click();
  }

  async function handleUpload(file: File) {
    if (!user) {
      alert('Please log in to upload a pitch deck');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setAnalysisProgress(null);

    try {
      // Step 1: Extract PDF pages as images
      setUploadProgress(10);
      const pageImages = await extractPageImages(file, (progress) => {
        const extractionProgress = 10 + (progress.currentPage / progress.totalPages) * 30;
        setUploadProgress(Math.round(extractionProgress));
      });

      if (pageImages.length === 0) {
        throw new Error('Failed to extract pages from PDF');
      }

      if (pageImages.length > 30) {
        throw new Error('We can only analyze decks with 30 pages or less');
      }

      // Step 2: Create analysis record
      setUploadProgress(40);
      const analysisId = await createAnalysisRecord(
        file.name,
        file.size,
        pageImages.length,
        user.id
      );

      // Step 3: Upload images to storage
      const imageUrls = await uploadPageImages(pageImages, analysisId, (progress) => {
        const uploadProgress = 40 + (progress.currentPage / progress.totalPages) * 20;
        setUploadProgress(Math.round(uploadProgress));
      });

      // Step 4: Start sequential background analysis
      setUploadProgress(60);
      await startBackgroundAnalysis(file, analysisId, imageUrls, (progress) => {
        setAnalysisProgress(progress);
        // Update overall progress: 60% base + 40% for analysis
        const analysisProgressPercent = 60 + (progress.currentPage / progress.totalPages) * 35;
        const finalizingPercent = progress.status === 'finalizing' ? 95 : analysisProgressPercent;
        setUploadProgress(Math.round(finalizingPercent));
      });

      setUploadProgress(100);

      // Navigate to analysis view
      setTimeout(() => {
        onViewAnalysis(analysisId);
      }, 500);
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(error.message || 'Failed to analyze deck. Please try again.');
      setSelectedFile(null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setAnalysisProgress(null);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffMs = nowOnly.getTime() - dateOnly.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (diffDays === 0) return `Today, ${timeStr}`;
    if (diffDays === 1) return `Yesterday, ${timeStr}`;
    if (diffDays < 7) return `${diffDays} days ago, ${timeStr}`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    }) + `, ${timeStr}`;
  }

  function getScoreColor(score: number) {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  }

  function getScoreBgColor(score: number) {
    if (score >= 80) return 'bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'bg-blue-50 border-blue-200';
    if (score >= 40) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading your pitch decks...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Email Verification Banner - Only show for email/password signups, not Google OAuth */}
        {showVerificationBanner && user && emailVerified === false && (() => {
          const userMetadata = (user as any).app_metadata || (user as any).raw_app_meta_data || {};
          return userMetadata?.provider !== 'google';
        })() && (
          <div className="mb-6 bg-slate-900 border rounded-xl p-4 flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <Mail className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white mb-1">Verify your email address</h3>
                <p className="text-sm text-white mb-3">
                  Please verify your email address to ensure you receive important updates and notifications.
                </p>
                {verificationMessage && (
                  <p className={`text-sm mb-3 ${verificationMessage.includes('sent') ? 'text-green-700' : 'text-red-700'}`}>
                    {verificationMessage}
                  </p>
                )}
                <button
                  onClick={handleSendVerificationEmail}
                  disabled={sendingVerification}
                  className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {sendingVerification ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowVerificationBanner(false)}
              className="text-white hover:text-gray-300 transition-colors flex-shrink-0 ml-2"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {/* Header - Always visible */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                My Pitch Decks
              </h1>
              <p className="text-lg text-slate-600">
                {(() => {
                  const completedCount = analyses.filter(a => a.status === 'completed').length;
                  return `${completedCount} ${completedCount === 1 ? 'deck' : 'decks'} analyzed`;
                })()}
              </p>
            </div>
            <button
              onClick={() => {
                const newState = !showUploader;
                setShowUploader(newState);
                // Track if user explicitly closed it (only when closing, not opening)
                if (!newState) {
                  localStorage.setItem('deckfix_uploader_closed', 'true');
                } else {
                  localStorage.removeItem('deckfix_uploader_closed');
                }
              }}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all hover:shadow-lg hover:scale-105"
            >
              <Upload className="w-5 h-5" />
              {showUploader ? 'Close' : 'Upload New Deck'}
            </button>
          </div>

          {/* Uploader Section */}
          {showUploader && (
            <div className="mb-8">
              <AuthenticatedUploader 
                onUploadComplete={handleUploadComplete}
                onAnalysisComplete={handleUploadComplete}
              />
            </div>
          )}

            {/* Stats Overview */}
            {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 rounded-xl">
                    <FileText className="w-6 h-6 text-slate-700" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-slate-900">
                      {analyses.length}
                    </div>
                    <div className="text-sm text-slate-600">Total Decks</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-slate-900">
                      {Math.round(analyses.reduce((sum, a) => sum + a.overall_score, 0) / analyses.length)}
                    </div>
                    <div className="text-sm text-slate-600">Average Score</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Calendar className="w-6 h-6 text-blue-700" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-slate-900">
                      {analyses.filter(a => {
                        const diffDays = Math.floor((Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24));
                        return diffDays < 7;
                      }).length}
                    </div>
                    <div className="text-sm text-slate-600">This Week</div>
                  </div>
                </div>
              </div>
            </div> */}
        </div>

        {/* Deck List - Only show completed analyses */}
        {(() => {
          const completedAnalyses = analyses.filter(a => a.status === 'completed');
          return completedAnalyses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {completedAnalyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="group bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
                  onClick={() => onViewAnalysis(analysis.id)}
                >
                  {/* Cover Image - Full Width */}
                  <div className="w-full aspect-[16/9] bg-slate-100 relative overflow-hidden">
                    <img
                      src={getCoverImageUrl(analysis.id)}
                      alt={`${analysis.deck_name} cover`}
                      className="w-full h-full object-contain bg-white group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100"><svg class="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>';
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-3 mb-2">
                          <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-slate-700 transition-colors">
                            {analysis.deck_name}
                          </h3>
                          <span className={`text-sm font-semibold whitespace-nowrap ${getScoreColor(analysis.overall_score)}`}>
                            {formatScoreWithSuffix(normalizeScoreTo0To10(analysis.overall_score))}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(analysis.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            {analysis.total_pages} slides
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    {analysis.critical_issues_count !== undefined && analysis.critical_issues_count > 0 && (
                      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{analysis.critical_issues_count} critical {analysis.critical_issues_count === 1 ? 'issue' : 'issues'}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewAnalysis(analysis.id);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium rounded-2xl transition-all bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md cursor-pointer"
                      >
                        View Analysis
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(analysis.id, analysis.deck_name);
                        }}
                        disabled={deletingId === analysis.id}
                        className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                        title="Delete analysis"
                      >
                        {deletingId === analysis.id ? (
                          <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
}
