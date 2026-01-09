import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';

interface UploadZoneProps {
  isDragging: boolean;
  selectedFile: File | null;
  isAnalyzing: boolean;
  analysisProgress: number;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyze: () => void;
  onClearFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const funnyMessages = [
  "Please wait while our AI pretends to understand your TAM and nods confidently...",
  "Please wait while our AI asks itself if this should secretly be a Web3 startup..",
  "Please wait while our AI searches for proof your market is bigger than your imagination...",
  "Please wait while our AI confirms your traction includes humans you are not related to...",
  "Please wait while our AI asks, what would Peter Thiel hate about this?...",
  "Please wait while our AI looks for the mandatory hockey stick that defies gravity...",
  "Please wait while our AI counts buzzwords and judges you silently...",
  "Please wait while our AI verifies your 'unfair advantage' is actually unfair...",
  "Please wait while our AI inspects your moat to see if it holds water or hope....",
  "Please wait while our AI checks if 'synergy' appears more than twice...",
  "Please wait while our AI determines if your moat has any water in it...",
  "Please wait while our AI looks for the “Uber for something” slide you swore you removed...",
];

export function UploadZone({
  isDragging,
  selectedFile,
  isAnalyzing,
  analysisProgress,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onAnalyze,
  onClearFile,
  fileInputRef,
}: UploadZoneProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    if (!isAnalyzing) return;

    const messageInterval = setInterval(() => {
      setFadeIn(false);

      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % funnyMessages.length);
        setFadeIn(true);
      }, 300);
    }, 6000);

    return () => clearInterval(messageInterval);
  }, [isAnalyzing]);

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative border-2 border-dashed rounded-2xl p-12 transition-all ${
        isDragging
          ? 'border-slate-500 bg-white/60 backdrop-blur-md'
          : selectedFile
          ? 'border-green-400 bg-white/60 backdrop-blur-md'
          : 'border-slate-300 bg-white/50 backdrop-blur-xl hover:border-slate-400'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        id="file-upload"
        className="hidden"
        accept=".pdf,.ppt,.pptx"
        onChange={onFileSelect}
        disabled={isAnalyzing}
      />

      {selectedFile ? (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/60 backdrop-blur-md rounded-full mb-4 border border-green-200">
            {isAnalyzing ? (
              <Loader2 className="w-8 h-8 text-slate-700 animate-spin" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            )}
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {isAnalyzing ? 'Analyzing Your Pitch Deck...' : 'File Ready for Analysis'}
          </h3>
          <p className="text-slate-600 mb-1">{selectedFile.name}</p>
          <p className="text-sm text-slate-500 mb-6">
            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>

          {isAnalyzing && (
            <div className="mb-6 max-w-2xl mx-auto">
              <div
                className={`text-sm text-slate-700 italic transition-opacity duration-300 ${
                  fadeIn ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {funnyMessages[currentMessageIndex]}
              </div>
              <p className="text-xs text-slate-500 mt-3">This usually takes 30-60 seconds</p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              variant="primary"
              icon={Sparkles}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Pitch Deck'}
            </Button>
            {!isAnalyzing && (
              <Button onClick={onClearFile} variant="ghost">
                Change File
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/60 backdrop-blur-md rounded-full mb-4 border border-slate-200">
            <Upload className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            Upload Your Pitch Deck
          </h3>
          <p className="text-slate-600 mb-6">
            Drag and drop your file here, or click to browse
          </p>
          <label
            htmlFor="file-upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/60 backdrop-blur-md border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:border-slate-400 hover:bg-white/80 transition-all cursor-pointer"
          >
            <FileText className="w-5 h-5" />
            Choose File
          </label>
          <p className="text-sm text-slate-500 mt-4">
            Supported formats: PDF, PPT, PPTX (Max 50MB)
          </p>
        </div>
      )}
    </div>
  );
}
