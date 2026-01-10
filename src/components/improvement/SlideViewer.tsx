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

  const getScoreColor = (scoreValue: number) => {
    const normalizedScore = scoreValue / 10;
    if (normalizedScore >= 8) return 'text-green-600 bg-green-100';
    if (normalizedScore >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const hasValidImage = imageUrl && !imageError;
  const scoreOutOf10 = (score / 10).toFixed(1);

  return (
    <>
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 p-6 shadow-lg">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col justify-center space-y-4">
            <div>
              <p className="text-sm text-slate-600 mb-1">Slide</p>
              <h3 className="text-4xl font-bold text-slate-900">#{slideNumber}</h3>
            </div>

            <div>
              <p className="text-sm text-slate-600 mb-2">Title</p>
              <h4 className="text-xl font-bold text-slate-900 leading-tight">{title}</h4>
            </div>

            <div>
              <p className="text-sm text-slate-600 mb-2">Score</p>
              <span className={`inline-flex items-center px-4 py-2 rounded-xl text-2xl font-bold ${getScoreColor(score)}`}>
                {scoreOutOf10}/10
              </span>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="relative w-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl overflow-hidden shadow-inner" style={{ aspectRatio: '16/9' }}>
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

              {hasValidImage && (
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-white/90 hover:bg-white shadow-lg transition-colors backdrop-blur-sm"
                  title="View fullscreen"
                >
                  <ZoomIn className="w-4 h-4 text-slate-700" />
                </button>
              )}
            </div>
          </div>
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
