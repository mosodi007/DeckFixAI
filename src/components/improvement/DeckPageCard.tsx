import { FileText, AlertCircle, Wrench } from 'lucide-react';

interface DeckPageCardProps {
  page: {
    pageNumber: number;
    title: string;
    score: number;
    thumbnail?: string | null;
  };
  isSelected: boolean;
  issueCount: number;
  onClick: () => void;
  onFixClick?: (e: React.MouseEvent) => void;
}

export function DeckPageCard({ page, isSelected, issueCount, onClick, onFixClick }: DeckPageCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div
      className={`w-full group transition-all duration-300 ${
        isSelected
          ? 'ring-2 ring-blue-500 shadow-lg scale-[1.02]'
          : 'hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      <div className={`bg-white/90 backdrop-blur-sm rounded-xl border p-4 ${
        isSelected ? 'border-blue-500' : 'border-slate-200/60'
      }`}>
        <div className="flex items-start gap-3">
          {/* Thumbnail */}
          <button
            onClick={onClick}
            className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center overflow-hidden"
          >
            {page.thumbnail ? (
              <img src={page.thumbnail} alt={`Slide ${page.pageNumber}`} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <FileText className="w-8 h-8 text-slate-400" />
            )}
          </button>

          {/* Page Info */}
          <div className="flex-1 text-left min-w-0">
            <button onClick={onClick} className="w-full text-left">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getScoreColor(page.score)}`}>
                  {page.score}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 text-sm mb-2 truncate">
                Slide {page.pageNumber} - {page.title}
              </h3>

              {issueCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-orange-600">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="font-medium">
                    {issueCount} {issueCount === 1 ? 'issue' : 'issues'}
                  </span>
                </div>
              )}
            </button>

            {/* Fix Button */}
            {onFixClick && (
              <button
                onClick={onFixClick}
                className="mt-3 w-full px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Fix This Slide</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
