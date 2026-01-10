import { useState, useRef, useEffect } from 'react';
import { Sparkles, CheckCircle2, TrendingUp, Lock } from 'lucide-react';
import { UploadZone } from './upload/UploadZone';
import { FeatureCard } from './upload/FeatureCard';
import { analyzeDeck } from '../services/analysisService';
import { extractPageImages } from '../services/pdfImageExtractor';
import { uploadPageImages } from '../services/storageService';
import { v4 as uuidv4 } from 'uuid';

interface UploadViewProps {
  onAnalysisComplete: (data: any) => void;
  isAuthenticated: boolean;
  onSignUpClick: () => void;
}

export function UploadView({ onAnalysisComplete, isAuthenticated, onSignUpClick }: UploadViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  useEffect(() => {
    if (!isAnalyzing) {
      setAnalysisProgress(0);
    }
  }, [isAnalyzing]);

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      const analysisId = uuidv4();

      setAnalysisProgress(10);

      const images = await extractPageImages(selectedFile, (progress) => {
        const extractionProgress = 10 + (progress.currentPage / progress.totalPages) * 30;
        setAnalysisProgress(extractionProgress);
      });

      setAnalysisProgress(40);

      const imageUrls = await uploadPageImages(images, analysisId, (progress) => {
        const uploadProgress = 40 + (progress.currentPage / progress.totalPages) * 20;
        setAnalysisProgress(uploadProgress);
      });

      setAnalysisProgress(60);

      await analyzeDeck(selectedFile, analysisId, imageUrls);

      setAnalysisProgress(100);

      setTimeout(() => {
        onAnalysisComplete({ analysisId });
      }, 500);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to analyze deck. Please try again.');
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };


  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-7xl font-semibold text-slate-900 mb-4 tracking-tighter">
            Make your Pitch Deck Investor-Ready in Minutes.
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Receive professional AI analysis based on industry VC standards and patterns from thousands of successfully funded startups.
          </p>
        </div>

        <div className="relative">
          <div className="filter blur-sm pointer-events-none select-none opacity-50">
            <div className="bg-white/80 backdrop-blur-md border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Upload Your Pitch Deck</h3>
              <p className="text-sm text-slate-600 mb-6">Drag & drop your PDF or click to browse</p>
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 border-2 border-slate-200">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  Sign Up to Get Started
                </h3>
                <p className="text-slate-600 mb-6">
                  Create a free account to upload and analyze your pitch deck. Your data is secure and private.
                </p>
                <button
                  onClick={onSignUpClick}
                  className="w-full py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-lg"
                >
                  Sign Up for Free
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={Sparkles}
            title="AI-Powered Analysis"
            description="Advanced algorithms trained on thousands of successful pitch decks and funding outcomes"
          />
          <FeatureCard
            icon={TrendingUp}
            title="VC Perspective"
            description="Get insights from the investor's point of view with industry-standard evaluation metrics"
          />
          <FeatureCard
            icon={CheckCircle2}
            title="Actionable Insights"
            description="Receive specific recommendations to improve your deck and increase funding odds"
            iconColor="border-green-200"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-7xl font-semibold text-slate-900 mb-4 tracking-tighter">
          Make your Pitch Deck Investor-Ready in Minutes.
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Receive professional AI analysis based on industry VC standards and patterns from thousands of successfully funded startups.
        </p>
      </div>

      <UploadZone
        isDragging={isDragging}
        selectedFile={selectedFile}
        isAnalyzing={isAnalyzing}
        analysisProgress={analysisProgress}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileSelect={handleFileSelect}
        onAnalyze={handleAnalyze}
        onClearFile={() => setSelectedFile(null)}
        fileInputRef={fileInputRef}
      />

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard
          icon={Sparkles}
          title="AI-Powered Analysis"
          description="Advanced algorithms trained on thousands of successful pitch decks and funding outcomes"
        />
        <FeatureCard
          icon={TrendingUp}
          title="VC Perspective"
          description="Get insights from the investor's point of view with industry-standard evaluation metrics"
        />
        <FeatureCard
          icon={CheckCircle2}
          title="Actionable Insights"
          description="Receive specific recommendations to improve your deck and increase funding odds"
          iconColor="border-green-200"
        />
      </div>
    </div>
  );
}
