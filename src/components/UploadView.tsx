import { useState, useRef, useEffect } from 'react';
import { Sparkles, CheckCircle2, TrendingUp } from 'lucide-react';
import { UploadZone } from './upload/UploadZone';
import { AnalysisProgress } from './upload/AnalysisProgress';
import { FeatureCard } from './upload/FeatureCard';
import { analyzeDeck } from '../services/analysisService';
import { extractPageImages } from '../services/pdfImageExtractor';
import { uploadPageImages } from '../services/storageService';
import { v4 as uuidv4 } from 'uuid';

interface UploadViewProps {
  onAnalysisComplete: (data: any) => void;
}

export function UploadView({ onAnalysisComplete }: UploadViewProps) {
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


  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-7xl font-bold text-slate-900 mb-4">
          Make your Pitch Deck Investor-Ready In Seconds with AI 
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Upload your pitch deck and receive professional investment analysis based on industry standards
          and patterns from thousands of successfully funded startups.
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

      {isAnalyzing && <AnalysisProgress />}

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
