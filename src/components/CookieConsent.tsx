import { useState, useEffect } from 'react';
import { X, Cookie } from 'lucide-react';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Small delay to ensure page loads first
      setTimeout(() => {
        setShowBanner(true);
      }, 1000);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-sm">
      <div className="bg-white rounded-xl shadow-2xl border-2 border-slate-200 p-5 relative">
        {/* Close Button */}
        <button
          onClick={handleDecline}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon and Title */}
        <div className="flex items-center gap-3 mb-3 pr-6">
          <h3 className="text-base font-bold text-slate-900">
            We Use Cookies
          </h3>
        </div>

        {/* Content */}
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          We use cookies to enhance your browsing experience and analyze site traffic. 
          By continuing, you consent to our use of cookies.
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleDecline}
            className="flex-1 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

