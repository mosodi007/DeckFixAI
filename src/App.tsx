import { useState } from 'react';
import { UploadView } from './components/UploadView';
import { AnalysisView } from './components/AnalysisView';
import { ImprovementFlowView } from './components/ImprovementFlowView';
import { getAnalysis } from './services/analysisService';
import { adaptAnalysisData } from './utils/dataAdapter';

function App() {
  const [view, setView] = useState<'upload' | 'analysis' | 'improvement'>('upload');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalysisComplete = async (data: any) => {
    setIsLoading(true);
    try {
      const analysis = await getAnalysis(data.analysisId);
      const adaptedData = adaptAnalysisData(analysis);
      setAnalysisData(adaptedData);
      setView('analysis');
    } catch (error) {
      console.error('Failed to load analysis:', error);
      alert('Failed to load analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
        {isLoading ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading analysis...</p>
            </div>
          </div>
        ) : view === 'upload' ? (
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
