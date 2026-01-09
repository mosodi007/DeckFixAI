import { useState } from 'react';
import { UploadView } from './components/UploadView';
import { AnalysisView } from './components/AnalysisView';

function App() {
  const [view, setView] = useState<'upload' | 'analysis'>('upload');
  const [analysisData, setAnalysisData] = useState<any>(null);

  const handleAnalysisComplete = (data: any) => {
    setAnalysisData(data);
    setView('analysis');
  };

  const handleNewAnalysis = () => {
    setView('upload');
    setAnalysisData(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img
                src="/deckfix_logo.png"
                alt="DeckFix.ai"
                className="h-8"
              />
            </div>
            {view === 'analysis' && (
              <button
                onClick={handleNewAnalysis}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Analyze New Deck
              </button>
            )}
          </div>
        </div>
      </nav>

      <main>
        {view === 'upload' ? (
          <UploadView onAnalysisComplete={handleAnalysisComplete} />
        ) : (
          <AnalysisView data={analysisData} onNewAnalysis={handleNewAnalysis} />
        )}
      </main>
    </div>
  );
}

export default App;
