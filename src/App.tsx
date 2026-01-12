import { useState, useEffect } from 'react';
import { ChevronDown, LogOut, LayoutDashboard, CreditCard, DollarSign, Calendar } from 'lucide-react';
import { UploadView } from './components/UploadView';
import { AnalysisView } from './components/AnalysisView';
import { ImprovementFlowView } from './components/ImprovementFlowView';
import { DashboardView } from './components/DashboardView';
import { PricingView } from './components/PricingView';
import { PricingPagePublic } from './components/PricingPagePublic';
import { CreditHistoryView } from './components/CreditHistoryView';
import { UsageHistoryView } from './components/UsageHistoryView';
import { ReferralView } from './components/ReferralView';
import { ReferralWelcomeModal } from './components/ReferralWelcomeModal';
import { CookieConsent } from './components/CookieConsent';
import { PrivacyPolicy } from './components/policies/PrivacyPolicy';
import { TermsAndConditions } from './components/policies/TermsAndConditions';
import { RefundPolicy } from './components/policies/RefundPolicy';
import { CookiePolicy } from './components/policies/CookiePolicy';
import { FAQPage } from './components/support/FAQPage';
import { HelpSupportPage } from './components/support/HelpSupportPage';
import { CreditBalanceIndicator } from './components/CreditBalanceIndicator';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Footer } from './components/Footer';
import { LoginModal } from './components/auth/LoginModal';
import { SignUpModal } from './components/auth/SignUpModal';
import { getAnalysis, getMostRecentAnalysis } from './services/analysisService';
import { analyzeSlides } from './services/slideAnalysisService';
import { adaptAnalysisData } from './utils/dataAdapter';
import { useAuth } from './contexts/AuthContext';
import { logout } from './services/authService';
import { useGoogleOneTap } from './hooks/useGoogleOneTap';

function App() {
  const { user, userProfile, isAuthenticated, loading: authLoading } = useAuth();
  const [view, setView] = useState<'dashboard' | 'upload' | 'analysis' | 'improvement' | 'pricing' | 'credits' | 'usage-history' | 'referrals' | 'privacy' | 'terms' | 'refund' | 'cookies' | 'faq' | 'help-support'>('upload');

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzingSlides, setIsAnalyzingSlides] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [preselectedTierCredits, setPreselectedTierCredits] = useState<number | undefined>(undefined);
  const [referralCodeFromUrl, setReferralCodeFromUrl] = useState<string | undefined>(undefined);

  useGoogleOneTap({
    disabled: isAuthenticated,
    onSuccess: () => {
      console.log('Google One Tap sign-in successful');
    },
    onError: (error) => {
      console.error('Google One Tap error:', error.message);
    },
  });

  // Check for referral code in URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setReferralCodeFromUrl(refCode);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setView('dashboard');
      setIsLoading(false);
      // Show welcome modal for new users (first time only)
      // Check if user just signed up by checking if they have a referral code in URL or if it's their first visit
      const hasSeenWelcome = localStorage.getItem('hasSeenWelcomeModal');
      if (!hasSeenWelcome && (referralCodeFromUrl || user)) {
        // Small delay to ensure user profile is loaded
        setTimeout(() => {
          setShowWelcomeModal(true);
          localStorage.setItem('hasSeenWelcomeModal', 'true');
        }, 1000);
      }
    } else {
      setIsLoading(false);
      // Only set to 'upload' if not already on pricing page
      if (view !== 'pricing') {
        setView('upload');
      }
      setAnalysisData(null);
    }
  }, [isAuthenticated, user, referralCodeFromUrl]);

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
    console.log('handleAnalysisComplete called with:', data);
    // Check if we should redirect to dashboard (background analysis)
    if (data.redirectToDashboard) {
      console.log('Redirecting to dashboard');
      setView('dashboard');
      // Store analysisId for potential future use
      if (data.analysisId) {
        localStorage.setItem('currentAnalysisId', data.analysisId);
      }
      return;
    }

    // Original flow: load analysis and show analysis view
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
    setView('upload');
    setAnalysisData(null);
    localStorage.removeItem('currentAnalysisId');
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
            <button
              onClick={() => {
                if (isAuthenticated) {
                  setView('dashboard');
                } else {
                  setView('upload');
                }
                setAnalysisData(null);
                localStorage.removeItem('currentAnalysisId');
              }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img
                src="/deckfix_logo.png"
                alt="DeckFix.ai"
                className="h-8"
              />
            </button>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3 ml-auto">
                    <button
                      onClick={handleGoToDashboard}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      My Decks
                    </button>
                    <CreditBalanceIndicator onViewHistory={() => setView('credits')} />
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {userProfile?.avatarUrl ? (
                        <img
                          src={userProfile.avatarUrl}
                          alt={userProfile?.fullName || user?.email || 'User'}
                          className="w-8 h-8 rounded-full object-cover border-2 border-slate-200"
                          onError={(e) => {
                            // Fallback to initial if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-semibold ${userProfile?.avatarUrl ? 'hidden' : ''}`}
                      >
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
                          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3">
                            {userProfile?.avatarUrl ? (
                              <img
                                src={userProfile.avatarUrl}
                                alt={userProfile?.fullName || user?.email || 'User'}
                                className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
                                onError={(e) => {
                                  // Fallback to initial if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-semibold text-sm ${userProfile?.avatarUrl ? 'hidden' : ''}`}
                            >
                              {(userProfile?.fullName || user?.email)?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              {userProfile?.fullName && (
                                <p className="text-sm font-medium text-slate-900 mb-1 truncate">{userProfile.fullName}</p>
                              )}
                              <p className="text-xs text-slate-600 truncate">{user?.email}</p>
                            </div>
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
                <>
                  {/* Centered Menu Items */}
                  <div className="flex items-center gap-2 flex-1 justify-center">
                    <a
                      href="/"
                      className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Home
                    </a>
                    <button
                      onClick={() => {
                        const element = document.getElementById('how-it-works');
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        } else {
                          // If not on upload page, navigate to it
                          setView('upload');
                          setTimeout(() => {
                            const el = document.getElementById('how-it-works');
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }, 100);
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      How it works
                    </button>
                    
                    <a
                      href="https://cal.com/deckfixai/30min"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      Book a demo
                    </a>
                    <button
                      onClick={() => {
                        setView('pricing');
                      }}
                      className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Pricing
                    </button>
                  </div>
                  
                  {/* Right-aligned Auth Buttons */}
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
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main>
        {(isLoading || authLoading) ? (
          <LoadingSpinner message={isLoading ? 'Loading your analysis...' : 'Initializing...'} />
        ) : view === 'pricing' ? (
          !isAuthenticated ? (
            <PricingPagePublic onSignUp={() => setShowSignUpModal(true)} />
          ) : (
            <PricingView preselectedTierCredits={preselectedTierCredits} />
          )
        ) : view === 'credits' ? (
          <CreditHistoryView
            onBack={handleGoToDashboard}
            onViewUsageHistory={() => setView('usage-history')}
            onViewPricing={(tierCredits) => {
              setPreselectedTierCredits(tierCredits);
              setView('pricing');
            }}
            onViewReferrals={() => setView('referrals')}
          />
        ) : view === 'usage-history' ? (
          <UsageHistoryView onBack={() => setView('credits')} />
        ) : view === 'referrals' ? (
          <ReferralView onBack={() => setView('credits')} />
        ) : view === 'privacy' ? (
          <PrivacyPolicy onBack={() => setView(isAuthenticated ? 'dashboard' : 'upload')} />
        ) : view === 'terms' ? (
          <TermsAndConditions onBack={() => setView(isAuthenticated ? 'dashboard' : 'upload')} />
        ) : view === 'refund' ? (
          <RefundPolicy onBack={() => setView(isAuthenticated ? 'dashboard' : 'upload')} />
        ) : view === 'cookies' ? (
          <CookiePolicy onBack={() => setView(isAuthenticated ? 'dashboard' : 'upload')} />
        ) : view === 'faq' ? (
          <FAQPage onBack={() => setView(isAuthenticated ? 'dashboard' : 'upload')} />
        ) : view === 'help-support' ? (
          <HelpSupportPage onBack={() => setView(isAuthenticated ? 'dashboard' : 'upload')} />
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

      {!isAuthenticated && <Footer onNavigate={(view) => setView(view)} />}

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
            // Show welcome modal after successful signup
            setTimeout(() => {
              setShowWelcomeModal(true);
            }, 500);
          }}
          referralCode={referralCodeFromUrl}
        />
      )}

      {showWelcomeModal && (
        <ReferralWelcomeModal
          onClose={() => setShowWelcomeModal(false)}
          referralCodeFromUrl={referralCodeFromUrl}
        />
      )}

      <CookieConsent />
    </div>
  );
}

export default App;
