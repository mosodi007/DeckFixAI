import { useState, useEffect } from 'react';
import {
  X,
  Menu,
  Home,
  Sparkles,
  Calendar,
  DollarSign,
  LogIn,
  UserPlus,
  LayoutDashboard,
  CreditCard,
  LogOut,
  ChevronRight,
  Wallet,
} from 'lucide-react';

interface MobileMenuProps {
  isAuthenticated: boolean;
  user?: { email?: string } | null;
  userProfile?: { fullName?: string; avatarUrl?: string } | null;
  creditBalance?: number;
  onNavigate: (view: string) => void;
  onLogin: () => void;
  onSignUp: () => void;
  onLogout: () => void;
  onScrollToSection?: (sectionId: string) => void;
}

export function MobileMenu({
  isAuthenticated,
  user,
  userProfile,
  creditBalance = 0,
  onNavigate,
  onLogin,
  onSignUp,
  onLogout,
  onScrollToSection,
}: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNavigate = (view: string) => {
    onNavigate(view);
    setIsOpen(false);
  };

  const handleScrollTo = (sectionId: string) => {
    onScrollToSection?.(sectionId);
    setIsOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 -mr-2 text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/70 z-50 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Slide-out Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-white z-50 lg:hidden transform transition-transform duration-300 ease-out shadow-2xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <img src="/deckfix_logo.png" alt="DeckFix.ai" className="h-7" />
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 -mr-2 text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Menu Content */}
        <div className="flex flex-col h-[calc(100%-65px)] overflow-y-auto">
          {isAuthenticated ? (
            <>
              {/* User Profile Section */}
              <div className="p-4 bg-slate-900">
                <div className="flex items-center gap-3">
                  {userProfile?.avatarUrl ? (
                    <img
                      src={userProfile.avatarUrl}
                      alt={userProfile?.fullName || user?.email || 'User'}
                      className="w-12 h-12 rounded-full object-cover border-2 border-slate-700"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-slate-800 text-white rounded-full flex items-center justify-center font-semibold text-lg border-2 border-slate-700">
                      {(userProfile?.fullName || user?.email)?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {userProfile?.fullName && (
                      <p className="text-white font-medium truncate">{userProfile.fullName}</p>
                    )}
                    <p className="text-slate-400 text-sm truncate">{user?.email}</p>
                  </div>
                </div>

                {/* Credit Balance */}
                {/* <button
                  onClick={() => handleNavigate('credits')}
                  className="mt-4 w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-slate-300" />
                    </div>
                    <div className="text-left">
                      <p className="text-slate-400 text-xs">Credit Balance</p>
                      <p className="text-white font-semibold">{creditBalance} credits</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </button> */}
              </div>

              {/* Authenticated Menu Items */}
              <nav className="flex-1 p-3">
                <div className="space-y-1">
                  <button
                    onClick={() => handleNavigate('dashboard')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <LayoutDashboard className="w-5 h-5 text-slate-900" />
                    <span className="font-medium">My Decks</span>
                  </button>

                  <button
                    onClick={() => handleNavigate('upload')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <Sparkles className="w-5 h-5 text-slate-900" />
                    <span className="font-medium">Analyze New Deck</span>
                  </button>

                  <button
                    onClick={() => handleNavigate('pricing')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <DollarSign className="w-5 h-5 text-slate-900" />
                    <span className="font-medium">Pricing & Plans</span>
                  </button>

                  <button
                    onClick={() => handleNavigate('credits')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <CreditCard className="w-5 h-5 text-slate-900" />
                    <span className="font-medium">Subscription & Credits</span>
                  </button>
                </div>
              </nav>

              {/* Sign Out Button */}
              <div className="p-4 border-t border-slate-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-slate-900 border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors font-medium"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Guest Menu Items */}
              <nav className="flex-1 p-3">
                <div className="space-y-1">
                  <button
                    onClick={() => handleNavigate('upload')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <Home className="w-5 h-5 text-slate-900" />
                    <span className="font-medium">Home</span>
                  </button>

                  <button
                    onClick={() => handleScrollTo('how-it-works')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <Sparkles className="w-5 h-5 text-slate-900" />
                    <span className="font-medium">How it works</span>
                  </button>

                  <a
                    href="https://cal.com/deckfixai/30min"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <Calendar className="w-5 h-5 text-slate-900" />
                    <span className="font-medium">Book a demo</span>
                  </a>

                  <button
                    onClick={() => handleNavigate('pricing')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <DollarSign className="w-5 h-5 text-slate-900" />
                    <span className="font-medium">Pricing</span>
                  </button>
                </div>
              </nav>

              {/* Auth Buttons */}
              <div className="p-4 border-t border-slate-200">
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      onLogin();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-slate-900 border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors font-medium"
                  >
                    <LogIn className="w-5 h-5" />
                    Login
                  </button>
                  <button
                    onClick={() => {
                      onSignUp();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white bg-slate-900 hover:bg-black rounded-xl transition-colors font-medium"
                  >
                    <UserPlus className="w-5 h-5" />
                    Sign Up Free
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
