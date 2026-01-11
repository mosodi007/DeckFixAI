import { useState, useEffect } from 'react';
import { ChevronDown, LogOut, LayoutDashboard, CreditCard, DollarSign } from 'lucide-react';
import { UploadView } from './components/UploadView';
import { AnalysisView } from './components/AnalysisView';
import { ImprovementFlowView } from './components/ImprovementFlowView';
import { DashboardView } from './components/DashboardView';
import { PricingView } from './components/PricingView';
import { CreditHistoryView } from './components/CreditHistoryView';
import { UsageHistoryView } from './components/UsageHistoryView';
import { CreditBalanceIndicator } from './components/CreditBalanceIndicator';
import { LoginModal } from './components/auth/LoginModal';
import { SignUpModal } from './components/auth/SignUpModal';
import { getAnalysis, getMostRecentAnalysis } from './services/analysisService';
import { analyzeSlides } from './services/slideAnalysisService';
import { adaptAnalysisData } from './utils/dataAdapter';
import { useAuth } from './contexts/AuthContext';
import { logout } from './services/authService';
import { useGoogleOneTap } from './hooks/useGoogleOneTap';

function App() {
  const { user, userProfile, isAuthenticated } = useAuth();
  const [view, setView] = useState<'dashboard' | 'upload' | 'analysis' | 'improvement' | 'pricing' | 'credits' | 'usage-history'>('upload');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzingSlides, setIsAnalyzingSlides] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [preselectedTierCredits, setPreselectedTierCredits] = useState<number | undefined>(undefined);

  useGoogleOneTap({
    disabled: isAuthenticated,
    onSuccess: () => {
      console.log('Google One Tap sign-in successful');
    },
    onError: (error) => {
      console.error('Google One Tap error:', error.message);
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      setView('dashboard');
      setIsLoading(false);
    } else {
      setIsLoading(false);
      setView('upload');
      setAnalysisData(null);
    }
  }, [isAuthenticated]);

  const loadPersistedAnalysis = async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const storedAnalysisId = localStorage.getItem('currentAnalysisId');

      let analysis;
      if (storedAnalysisId) {
        try {
          analysis = await getAnalysis(storedAnalysisId);
        } catch (error) {
          console.error('Failed to load stored analysis, loading most recent:', error);
          try {
            analysis = await getMostRecentAnalysis();
          } catch (recentError) {
            console.error('Failed to load recent analysis:', recentError);
          }
        }
      } else {
        try {
          analysis = await getMostRecentAnalysis();
        } catch (recentError) {
          console.error('Failed to load recent analysis:', recentError);
        }
      }

      if (analysis) {
        const adaptedData = adaptAnalysisData(analysis);
        setAnalysisData(adaptedData);
        setView('analysis');
        localStorage.setItem('currentAnalysisId', analysis.id);
      }
    } catch (error) {
      console.error('Failed to load analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalysisComplete = async (data: any) => {
    setIsLoading(true);
    try {
      const analysis = await getAnalysis(data.analysisId);
      const adaptedData = adaptAnalysisData(analysis);
      setAnalysisData(adaptedData);
      setView('analysis');
      localStorage.setItem('currentAnalysisId', data.analysisId);
    } catch (error) {
      console.error('Failed to load analysis:', error);
      alert('Failed to load analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewAnalysis = () => {
    if (isAuthenticated) {
      setView('dashboard');
    } else {
      setView('upload');
    }
    setAnalysisData(null);
  };

  const handleViewAnalysis = async (analysisId: string) => {
    setIsLoading(true);
    try {
      const analysis = await getAnalysis(analysisId);
      const adaptedData = adaptAnalysisData(analysis);
      setAnalysisData(adaptedData);
      setView('analysis');
      localStorage.setItem('currentAnalysisId', analysisId);
    } catch (error) {
      console.error('Failed to load analysis:', error);
      alert('Failed to load analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    setView('dashboard');
    setAnalysisData(null);
    setPreselectedTierCredits(undefined);
  };

  const handleOpenImprovementFlow = async () => {
    if (!isAuthenticated) {
      setShowSignUpModal(true);
      return;
    }

    if (!analysisData?.id) return;

    // Check if slides have already been analyzed
    if (analysisData.slidesAnalyzedAt) {
      console.log('Slides already analyzed at:', analysisData.slidesAnalyzedAt);
      setView('improvement');
      return;
    }

    setIsAnalyzingSlides(true);
    setView('improvement');

    try {
      console.log('Starting in-depth slide analysis with OpenAI Vision...');
      const result = await analyzeSlides(analysisData.id);
      console.log('Analysis result:', result);

      console.log('Reloading analysis data with enhanced feedback...');
      const updatedAnalysis = await getAnalysis(analysisData.id);
      const adaptedData = adaptAnalysisData(updatedAnalysis);
      setAnalysisData(adaptedData);

      console.log('Slide analysis complete! Enhanced feedback loaded.');
    } catch (error: any) {
      console.error('Failed to analyze slides:', error);
      alert(`Failed to analyze slides: ${error.message || 'Unknown error'}. Check console for details.`);
    } finally {
      setIsAnalyzingSlides(false);
    }
  };

  const handleBackToAnalysis = () => {
    setView('analysis');
  };

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
    setView('upload');
    setAnalysisData(null);
    localStorage.removeItem('currentAnalysisId');
  };

  const handleOpenSignUp = () => {
    setShowLoginModal(false);
    setShowSignUpModal(true);
  };

  const handleOpenLogin = () => {
    setShowSignUpModal(false);
    setShowLoginModal(true);
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
              {isAuthenticated ? (
                <>
                  <button
                    onClick={handleGoToDashboard}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    My Decks
                  </button>
                  <CreditBalanceIndicator onViewHistory={() => setView('credits')} />
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-semibold">
                        {(userProfile?.fullName || user?.email)?.charAt(0).toUpperCase()}
                      </div>
                      <span>{userProfile?.fullName || user?.email}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {showUserMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowUserMenu(false)}
                        />
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-20">
                          <div className="px-4 py-3 border-b border-slate-200">
                            {userProfile?.fullName && (
                              <p className="text-sm font-medium text-slate-900 mb-1">{userProfile.fullName}</p>
                            )}
                            <p className="text-xs text-slate-600">{user?.email}</p>
                          </div>
                          <button
                            onClick={() => {
                              setShowUserMenu(false);
                              setPreselectedTierCredits(undefined);
                              setView('pricing');
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <DollarSign className="w-4 h-4" />
                            Pricing & Plans
                          </button>
                          <button
                            onClick={() => {
                              setShowUserMenu(false);
                              setView('credits');
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <CreditCard className="w-4 h-4" />
                            Subscription & Credits
                          </button>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors border-t border-slate-200 mt-1 pt-2"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setShowSignUpModal(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main>
        {isLoading ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading...</p>
            </div>
          </div>
        ) : view === 'pricing' ? (
          <PricingView preselectedTierCredits={preselectedTierCredits} />
        ) : view === 'credits' ? (
          <CreditHistoryView
            onBack={handleGoToDashboard}
            onViewUsageHistory={() => setView('usage-history')}
            onViewPricing={(tierCredits) => {
              setPreselectedTierCredits(tierCredits);
              setView('pricing');
            }}
          />
        ) : view === 'usage-history' ? (
          <UsageHistoryView onBack={() => setView('credits')} />
        ) : view === 'dashboard' ? (
          <DashboardView
            onViewAnalysis={handleViewAnalysis}
            onNewUpload={() => setView('upload')}
          />
        ) : view === 'upload' ? (
          <UploadView
            onAnalysisComplete={handleAnalysisComplete}
            isAuthenticated={isAuthenticated}
          />
        ) : view === 'analysis' ? (
          <AnalysisView
            data={analysisData}
            onNewAnalysis={handleNewAnalysis}
            onOpenImprovementFlow={handleOpenImprovementFlow}
            isAuthenticated={isAuthenticated}
            onSignUpClick={() => setShowSignUpModal(true)}
          />
        ) : (
          <ImprovementFlowView
            data={analysisData}
            onBack={handleBackToAnalysis}
            isAnalyzing={isAnalyzingSlides}
            isAuthenticated={isAuthenticated}
            onSignUpClick={() => setShowSignUpModal(true)}
          />
        )}
      </main>

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSwitchToSignUp={handleOpenSignUp}
          onLoginSuccess={() => {
            setShowLoginModal(false);
          }}
        />
      )}

      {showSignUpModal && (
        <SignUpModal
          onClose={() => setShowSignUpModal(false)}
          onSwitchToLogin={handleOpenLogin}
          onSignUpSuccess={() => {
            setShowSignUpModal(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
