import { useState } from 'react';
import { UploadView } from './components/UploadView';
import { AnalysisView } from './components/AnalysisView';
import { ImprovementFlowView } from './components/ImprovementFlowView';

function App() {
  const [view, setView] = useState<'upload' | 'analysis' | 'improvement'>('upload');
  const [analysisData, setAnalysisData] = useState<any>(null);

  const handleAnalysisComplete = (data: any) => {
    setAnalysisData(data);
    setView('analysis');
  };

  const handleNewAnalysis = () => {
    setView('upload');
    setAnalysisData(null);
  };

  const handleOpenImprovementFlow = () => {
    setView('improvement');
  };

  const handleBackToAnalysis = () => {
    setView('analysis');
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

            <div className="flex items-center gap-3">
              {view === 'analysis' && (
                <div className="flex items-center gap-2">
                  
                </div>
              )}


              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                <button className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                  Login
                </button>
                <button className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm">
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {view === 'upload' ? (
          <UploadView onAnalysisComplete={handleAnalysisComplete} />
        ) : view === 'analysis' ? (
          <AnalysisView
            data={analysisData}
            onNewAnalysis={handleNewAnalysis}
            onOpenImprovementFlow={handleOpenImprovementFlow}
          />
        ) : (
          <ImprovementFlowView
            data={analysisData}
            onBack={handleBackToAnalysis}
          />
        )}
      </main>
    </div>
  );
}

export default App;
