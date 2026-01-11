import { useState, useRef } from 'react';
import { Sparkles, CheckCircle2, TrendingUp, Upload } from 'lucide-react';
import { analyzeDeck } from '../services/analysisService';
import { extractPageImages } from '../services/pdfImageExtractor';
import { uploadPageImages } from '../services/storageService';
import { getOrCreateSessionId } from '../services/sessionService';
import { v4 as uuidv4 } from 'uuid';
import { SEOContentSection } from './upload/SEOContentSection';

interface UploadViewProps {
  onAnalysisComplete: (data: any) => void;
  isAuthenticated: boolean;
}

export function UploadView({ onAnalysisComplete, isAuthenticated }: UploadViewProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      handleAnalyze(file);
    } else if (file) {
      alert('Please select a PDF file');
    }
  };

  const handleAnalyze = async (file: File) => {
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      const analysisId = uuidv4();
      const sessionId = isAuthenticated ? undefined : getOrCreateSessionId();

      setAnalysisProgress(10);

      const images = await extractPageImages(file, (progress) => {
        const extractionProgress = 10 + (progress.currentPage / progress.totalPages) * 30;
        setAnalysisProgress(extractionProgress);
      });

      setAnalysisProgress(40);

      const imageUrls = await uploadPageImages(images, analysisId, (progress) => {
        const uploadProgress = 40 + (progress.currentPage / progress.totalPages) * 20;
        setAnalysisProgress(uploadProgress);
      });

      setAnalysisProgress(60);

      const result = await analyzeDeck(file, analysisId, imageUrls, sessionId);

      setAnalysisProgress(100);

      setTimeout(() => {
        onAnalysisComplete({ analysisId: result.analysisId });
      }, 500);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to analyze deck. Please try again.');
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="text-7xl font-semibold text-slate-900 mb-4 tracking-tighter">
              Pitch Deck Expert Analysis & Instant Fix with AI 
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              DeckFix AI will help you analyze & fix critical issues, deal breakers & red flags that will increase funding odds by 98.6% and make your startup investor-ready.
            </p>
          </header>

          <section className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden mb-12">
            <div className="p-12">
              <div className="bg-gradient-to-br from-slate-50 to-white border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-slate-400 transition-all">
                <div className="w-24 h-24 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Upload className="w-12 h-12 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-3">
                  Analyze & Fix Your Startup Pitch Deck
                </h2>

                <p className="text-slate-600 mb-8 max-w-md mx-auto">
                  {isAnalyzing
                    ? 'AI is analyzing your pitch deck for investor readiness...'
                    : 'Upload your startup pitch deck PDF to get instant AI-powered analysis, scoring, and fixes that make your deck stand out to VCs and investors'}
                </p>

                {isAnalyzing ? (
                  <div className="max-w-md mx-auto">
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span className="text-slate-600">Analyzing...</span>
                      <span className="text-slate-900 font-semibold">{analysisProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-slate-900 transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${analysisProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-slate-500 mt-4">
                      This may take 30-60 seconds depending on deck size
                    </p>
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
                      onClick={() => fileInputRef.current?.click()}
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

            <div className="bg-slate-50 border-t border-slate-200 px-12 py-8">
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
            </div>
          </section>

          <SEOContentSection />
        </div>
      </div>
    </div>
  );
}
