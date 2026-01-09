import { FileText, ZoomIn } from 'lucide-react';
import { useState } from 'react';

interface SlideViewerProps {
  slideNumber: number;
  imageUrl?: string | null;
  title: string;
  score: number;
}

export function SlideViewer({ slideNumber, imageUrl, title, score }: SlideViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const hasValidImage = imageUrl && !imageError;

  return (
    <>
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 p-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Slide {slideNumber} - {title}</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${getScoreColor(score)}`}>
              {score}/100
            </span>
            {hasValidImage && (
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                title="View fullscreen"
              >
                <ZoomIn className="w-4 h-4 text-slate-700" />
              </button>
            )}
          </div>
        </div>

        <div className="relative w-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
          {hasValidImage ? (
            <img
              src={imageUrl}
              alt={`Slide ${slideNumber}: ${title}`}
              className="w-full h-full object-contain"
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <FileText className="w-16 h-16 mb-3" />
              <p className="text-sm font-medium">Slide Preview</p>
              <p className="text-xs text-slate-400 mt-1">Image not available</p>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
          <p className="text-xs font-semibold text-blue-900 mb-1">About This Slide:</p>
          <p className="text-xs text-blue-800">
            Review the feedback below to understand specific issues and recommendations for improving this slide.
          </p>
        </div>
      </div>

      {isFullscreen && hasValidImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute -top-12 right-0 text-white hover:text-slate-300 text-sm font-medium"
            >
              Close (ESC)
            </button>
            <img
              src={imageUrl}
              alt={`Slide ${slideNumber}: ${title}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
              <p className="font-semibold">Slide {slideNumber} - {title}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
