import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { extractPageImages } from '../services/pdfImageExtractor';
import { uploadPageImages } from '../services/storageService';
import { createAnalysisRecord, startBackgroundAnalysis, resumeBackgroundAnalysis, AnalysisProgress } from '../services/backgroundAnalysisService';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../contexts/CreditContext';
import { getAllActiveUploadStates, removeUploadState } from '../services/uploadPersistenceService';
import { supabase } from '../services/analysisService';

interface AuthenticatedUploaderProps {
  onUploadComplete?: () => void;
  onAnalysisComplete?: (analysisId: string) => void;
}

export function AuthenticatedUploader({ onUploadComplete, onAnalysisComplete }: AuthenticatedUploaderProps) {
  const { user } = useAuth();
  const { refreshCredits, credits } = useCredits();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const resumeCheckedRef = useRef(false);

  // Check for incomplete uploads on mount and resume them
  useEffect(() => {
    if (!user || resumeCheckedRef.current) return;
    resumeCheckedRef.current = true;

    const checkAndResumeUploads = async () => {
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

        // Resume the upload
        try {
          console.log(`Resuming upload for ${uploadState.analysisId}...`);
          setIsUploading(true);
          setSelectedFileName(uploadState.fileName);
          
          await resumeBackgroundAnalysis(
            uploadState.analysisId,
            uploadState.userId,
            uploadState.fileName,
            uploadState.fileSize,
            (progress) => {
              setAnalysisProgress(progress);
            }
          );

          setIsUploading(false);
          setSelectedFileName(null);
          setAnalysisProgress(null);
          
          if (onAnalysisComplete) {
            onAnalysisComplete(uploadState.analysisId);
          } else if (onUploadComplete) {
            onUploadComplete();
          }
        } catch (error) {
          console.error('Failed to resume upload:', error);
          setIsUploading(false);
          setSelectedFileName(null);
          setAnalysisProgress(null);
        }
      }
    };

    checkAndResumeUploads();
  }, [user, onUploadComplete, onAnalysisComplete]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      handleAnalyze(file);
    } else if (file) {
      alert('Please select a PDF file');
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        handleAnalyze(file);
      } else {
        alert('Please drop a PDF file');
      }
    }
  };

  const handleAnalyze = async (file: File) => {
    if (!file || !user) return;

    // Basic validation
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('File size must be less than 15MB');
      return;
    }

    setIsUploading(true);
    setSelectedFileName(file.name);

    try {
      // Step 1: Extract PDF pages as images
      console.log('Extracting PDF pages as images...');
      const pageImages = await extractPageImages(file, (progress) => {
        console.log(`Extracting: ${progress.currentPage}/${progress.totalPages}`);
      });
      console.log(`Extracted ${pageImages.length} pages`);

      if (pageImages.length === 0) {
        throw new Error('Failed to extract pages from PDF');
      }

      if (pageImages.length > 20) {
        throw new Error('PDF must have 20 pages or less');
      }

      // Step 2: Create analysis record
      console.log('Creating analysis record...');
      const analysisId = await createAnalysisRecord(
        file.name,
        file.size,
        pageImages.length,
        user.id
      );
      console.log(`Analysis record created: ${analysisId}`);

      // Step 3: Upload images to storage (with persistence)
      console.log('Uploading images to storage...');
      const imageUrls = await uploadPageImages(
        pageImages, 
        analysisId, 
        (progress) => {
          console.log(`Uploading: ${progress.currentPage}/${progress.totalPages}`);
        },
        {
          fileName: file.name,
          fileSize: file.size,
          userId: user.id,
          totalPages: pageImages.length,
        }
      );
      console.log(`Uploaded ${imageUrls.length} images`);

      // Step 4: Start sequential background analysis with progress
      console.log('Starting sequential background analysis...');
      await startBackgroundAnalysis(file, analysisId, imageUrls, (progress) => {
        setAnalysisProgress(progress);
      });
      console.log('Background analysis completed');

      // Step 5: Reset state and notify parent
      setSelectedFileName(null);
      setIsUploading(false);
      setAnalysisProgress(null);
      
      // Call onAnalysisComplete first (to navigate to results), then onUploadComplete (to reload list)
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisId);
      } else if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
      setSelectedFileName(null);
      setAnalysisProgress(null);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload deck. Please try again.';
      alert(errorMessage);
    }
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setSelectedFileName(null);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${
          isDragging
            ? 'border-slate-900 bg-slate-50 scale-[1.01]'
            : 'border-slate-300 bg-white hover:border-slate-400'
        } ${isUploading ? 'pointer-events-none opacity-75' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-4" />
            {analysisProgress ? (
              <>
                <p className="text-sm font-medium text-slate-900 mb-1">
                  {analysisProgress.status === 'finalizing' 
                    ? 'Finalizing analysis...' 
                    : `Analyzing Page ${analysisProgress.currentPage} of ${analysisProgress.totalPages}...`}
                </p>
                <div className="w-full max-w-xs mt-3">
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-slate-900 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(analysisProgress.currentPage / analysisProgress.totalPages) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm font-medium text-slate-900 mb-1">Uploading and preparing analysis...</p>
            )}
            <p className="text-xs text-slate-500 mt-2">{selectedFileName}</p>
          </div>
        ) : selectedFileName ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{selectedFileName}</p>
                <p className="text-xs text-slate-500">Ready to upload</p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="ml-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear file"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 transition-all ${
              isDragging ? 'bg-slate-900 scale-110' : 'bg-slate-100'
            }`}>
              <Upload className={`w-8 h-8 transition-colors ${
                isDragging ? 'text-white' : 'text-slate-700'
              }`} />
            </div>

            <h3 className={`text-lg font-semibold mb-2 transition-colors ${
              isDragging ? 'text-slate-900' : 'text-slate-900'
            }`}>
              {isDragging ? 'Drop your pitch deck here' : 'Upload New Pitch Deck'}
            </h3>

            <p className="text-sm text-slate-600 mb-6">
              {isDragging
                ? 'Release to upload your PDF file'
                : 'Choose your file or drag and drop to start analyzing'}
            </p>

            <button
              onClick={handleChooseFile}
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-all hover:shadow-lg"
            >
              <Upload className="w-4 h-4" />
              Choose File
            </button>
            <p className="text-xs text-slate-500 mt-3">
              PDF files only, max 15MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

