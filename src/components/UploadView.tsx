import { useState, useRef } from 'react';
import { Sparkles, CheckCircle2, TrendingUp, Upload } from 'lucide-react';
import { extractPageImages } from '../services/pdfImageExtractor';
import { uploadPageImages } from '../services/storageService';
import { createAnalysisRecord, startBackgroundAnalysis } from '../services/backgroundAnalysisService';
import { SEOContentSection } from './upload/SEOContentSection';
import { HowItWorksSection } from './HowItWorksSection';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../contexts/CreditContext';
import { LoginModal } from './auth/LoginModal';
import { SignUpModal } from './auth/SignUpModal';

interface UploadViewProps {
  onAnalysisComplete: (data: any) => void;
  isAuthenticated: boolean;
}

export function UploadView({ onAnalysisComplete, isAuthenticated }: UploadViewProps) {
  const { user } = useAuth();
  const { refreshCredits, credits } = useCredits();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [shouldOpenFilePicker, setShouldOpenFilePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleChooseFileClick = () => {
    if (!user) {
      setShowLoginModal(true);
      setShouldOpenFilePicker(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      handleAnalyze(file);
    } else if (file) {
      alert('Please select a PDF file');
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

    // No need to check isAnalyzing since we redirect immediately

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        if (!user) {
          setPendingFile(file);
          setShowLoginModal(true);
          setShouldOpenFilePicker(false);
        } else {
          handleAnalyze(file);
        }
      } else {
        alert('Please drop a PDF file');
      }
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    setShowSignUpModal(false);

    if (pendingFile) {
      handleAnalyze(pendingFile);
      setPendingFile(null);
    } else if (shouldOpenFilePicker) {
      setShouldOpenFilePicker(false);
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
    }
  };

  const handleAuthCancel = () => {
    setShowLoginModal(false);
    setShowSignUpModal(false);
    setPendingFile(null);
    setShouldOpenFilePicker(false);
  };

  const handleSwitchToSignUp = () => {
    setShowLoginModal(false);
    setShowSignUpModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowSignUpModal(false);
    setShowLoginModal(true);
  };

  const handleAnalyze = async (file: File) => {
    if (!file) return;

    // Ensure user is authenticated before starting
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setIsUploading(true);

    try {
      // Step 1: Extract images from PDF (frontend)
      console.log('Step 1: Extracting images from PDF...');
      const images = await extractPageImages(file);
      const totalPages = images.length;
      console.log(`Step 1 complete: Extracted ${totalPages} pages`);

      // Step 2: Create analysis record with 'pending' status
      console.log('Step 2: Creating analysis record...');
      const analysisId = await createAnalysisRecord(
        file.name,
        file.size,
        totalPages,
        user.id
      );
      console.log(`Step 2 complete: Analysis record created with ID: ${analysisId}`);

      // Step 3: Upload images to storage
      console.log('Step 3: Uploading images to storage...');
      const imageUrls = await uploadPageImages(images, analysisId);
      console.log(`Step 3 complete: Uploaded ${imageUrls.length} images`);

      // Step 4: Start background analysis (fire-and-forget)
      // Don't await - let it run in background
      console.log('Step 4: Starting background analysis...');
      startBackgroundAnalysis(file, analysisId, imageUrls).catch((error) => {
        console.error('Failed to start background analysis:', error);
        // Error handling is done in the service, which updates status to 'failed'
      });

      // Step 4.5: Poll for credit updates after analysis starts
      // Credits are deducted in the Edge Function when analysis starts
      // Poll multiple times to catch the credit deduction
      let pollCount = 0;
      const maxPolls = 15; // Poll for up to 15 seconds
      const pollInterval = 1000; // Every 1 second
      const initialBalance = credits?.creditsBalance || 0;
      
      const pollForCreditUpdate = setInterval(async () => {
        pollCount++;
        try {
          await refreshCredits();
          console.log(`Polling for credit update (attempt ${pollCount}/${maxPolls})`);
          
          // Stop polling after max attempts
          if (pollCount >= maxPolls) {
            clearInterval(pollForCreditUpdate);
            console.log('Stopped polling for credit updates after max attempts');
          }
        } catch (creditError) {
          console.error('Failed to refresh credits:', creditError);
          // Continue polling even if one refresh fails
        }
      }, pollInterval);
      
      // Cleanup polling after max time
      setTimeout(() => {
        clearInterval(pollForCreditUpdate);
      }, maxPolls * pollInterval);

      // Step 5: Show loader for 2-5 seconds, then redirect to Dashboard
      // Minimum 2 seconds, maximum 5 seconds based on file size
      const minDelay = 2000; // 2 seconds minimum
      const maxDelay = 5000; // 5 seconds maximum
      const delay = Math.min(maxDelay, Math.max(minDelay, totalPages * 200)); // ~200ms per page, capped at 5s
      
      console.log(`Waiting ${delay}ms before redirect...`);
      await new Promise(resolve => setTimeout(resolve, delay));

      console.log('Step 5: Redirecting to dashboard with analysisId:', analysisId);
      onAnalysisComplete({ 
        analysisId, 
        redirectToDashboard: true 
      });
      console.log('Redirect call completed');
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload deck. Please try again.';
      
      if (errorMessage.includes('Authentication') || errorMessage.includes('log in')) {
        alert('Your session has expired. Please log in again.');
        setShowLoginModal(true);
      } else {
        alert(errorMessage);
      }
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="text-3xl md:text-6xl font-semibold text-slate-900 mb-4 tracking-tighter">
              Make your startup pitch deck 'Investor-Ready' in minutes
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            DeckFix is an advanced AI, trained on thousands of successful pitch decks from funded startups. Get instant feedback on what investors look for, apply the instant fixes from DeckFix and save yourself hours and thousands of dollars.
            </p>
          </header>

          <section id="upload" className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden mb-12">
            <div className="p-2 md:p-12">
              <div
                className={`bg-gradient-to-br from-slate-50 to-white border-2 border-dashed rounded-2xl p-12 md:p-12 text-center transition-all ${
                  isDragging
                    ? 'border-slate-900 bg-slate-100 scale-[1.02]'
                    : 'border-slate-300 hover:border-slate-400'
                } ${isUploading ? 'pointer-events-none opacity-75' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all ${
                  isDragging ? 'bg-slate-900 scale-110' : 'bg-slate-900'
                }`}>
                  <Upload className={`w-12 h-12 text-white transition-transform ${
                    isDragging ? 'scale-110' : ''
                  }`} />
                </div>

                <h2 className={`text-xl font-semibold mb-3 transition-colors ${
                  isDragging ? 'text-slate-900' : 'text-slate-900'
                }`}>
                  {isDragging ? 'Drop your pitch deck here' : 'Upload your Startup Pitch Deck'}
                </h2>

                <p className="text-slate-600 mb-8 max-w-md mx-auto">
                  {isUploading
                    ? 'Preparing your deck for analysis...'
                    : isDragging
                    ? 'Release to upload your PDF file'
                    : 'Choose your file or drag and drop to start analyzing'}
                </p>

                {isUploading ? (
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mb-4"></div>
                    <p className="text-sm text-slate-600">Uploading and preparing analysis...</p>
                  </div>
                ) : (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={handleChooseFileClick}
                      className="inline-flex items-center gap-3 px-10 py-4 bg-slate-900 text-white text-lg font-semibold rounded-xl hover:bg-slate-800 transition-all hover:shadow-xl hover:scale-105"
                    >
                      <Upload className="w-6 h-6" />
                      Choose File
                    </button>
                    <p className="text-sm text-slate-500 mt-4">
                      PDF files only, max 50MB
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* <div className="bg-slate-50 border-t border-slate-200 px-12 py-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <article className="text-center">
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Sparkles className="w-7 h-7 text-slate-700" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">AI Pitch Deck Analyzer</h3>
                  <p className="text-sm text-slate-600">
                    Advanced AI trained on thousands of successful pitch decks from funded startups. Get instant feedback on what investors look for in your deck.
                  </p>
                </article>

                <article className="text-center">
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <TrendingUp className="w-7 h-7 text-slate-700" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">VC-Standard Scoring</h3>
                  <p className="text-sm text-slate-600">
                    Evaluate your pitch deck from an investor's perspective using venture capital criteria and industry benchmarks to find investors.
                  </p>
                </article>

                <article className="text-center">
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                    <CheckCircle2 className="w-7 h-7 text-slate-700" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">Automated Deck Fixes</h3>
                  <p className="text-sm text-slate-600">
                    Get AI-generated improvements and fixes for each slide. Make your startup pitch deck investor-ready with specific, actionable recommendations.
                  </p>
                </article>
              </div>
            </div> */}
          </section>

          <HowItWorksSection />

          <SEOContentSection />
        </div>
      </div>

      {showLoginModal && (
        <LoginModal
          onClose={handleAuthCancel}
          onSwitchToSignUp={handleSwitchToSignUp}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {showSignUpModal && (
        <SignUpModal
          onClose={handleAuthCancel}
          onSwitchToLogin={handleSwitchToLogin}
          onSignUpSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}
