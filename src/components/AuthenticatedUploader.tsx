import { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { uploadPdf, validatePdfFile } from '../services/pdfUploadService';
import { startAnalysis, pollJobStatus } from '../services/jobService';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../contexts/CreditContext';

interface AuthenticatedUploaderProps {
  onUploadComplete?: () => void;
}

export function AuthenticatedUploader({ onUploadComplete }: AuthenticatedUploaderProps) {
  const { user } = useAuth();
  const { refreshCredits, credits } = useCredits();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

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

    // Validate file first
    const validation = validatePdfFile(file);
    if (!validation.isValid) {
      alert(validation.error || 'Invalid file');
      return;
    }

    setIsUploading(true);
    setSelectedFileName(file.name);

    try {
      // Step 1: Upload PDF directly to storage
      console.log('Uploading PDF to storage...');
      const uploadResult = await uploadPdf(file, user.id);
      console.log(`PDF uploaded: ${uploadResult.bucket}/${uploadResult.pdfPath}`);

      // Step 2: Start analysis job
      console.log('Starting analysis job...');
      const { jobId, status } = await startAnalysis(
        uploadResult.pdfPath,
        uploadResult.bucket,
        file.name,
        file.size
      );
      console.log(`Analysis job started: ${jobId}, status: ${status}`);

      // Step 3: Poll job status until complete
      console.log('Polling job status...');
      const finalStatus = await pollJobStatus(
        jobId,
        (status) => {
          console.log(`Job status update: ${status.status}`);
          // Refresh credits when status changes (credits deducted on completion)
          if (status.status === 'done') {
            refreshCredits().catch(console.error);
          }
        },
        60, // Max 60 attempts
        2000 // Start with 2 second intervals
      );

      console.log(`Job completed with status: ${finalStatus.status}`);

      if (finalStatus.status === 'failed') {
        throw new Error(finalStatus.error || 'Analysis failed');
      }

      // Step 4: Reset state and notify parent
      setSelectedFileName(null);
      setIsUploading(false);
      
      // Refresh credits one more time to ensure UI is updated
      await refreshCredits();
      
      // Call onUploadComplete callback if provided
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
      setSelectedFileName(null);
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
            <p className="text-sm font-medium text-slate-900 mb-1">Uploading and preparing analysis...</p>
            <p className="text-xs text-slate-500">{selectedFileName}</p>
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

