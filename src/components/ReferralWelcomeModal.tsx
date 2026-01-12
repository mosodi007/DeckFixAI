import { useState, useEffect } from 'react';
import { X, Gift, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { validateReferralCode, applyReferralCode } from '../services/referralService';
import { useAuth } from '../contexts/AuthContext';

interface ReferralWelcomeModalProps {
  onClose: () => void;
  referralCodeFromUrl?: string;
}

export function ReferralWelcomeModal({ onClose, referralCodeFromUrl }: ReferralWelcomeModalProps) {
  const { user } = useAuth();
  const [promoCode, setPromoCode] = useState(referralCodeFromUrl || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);

  useEffect(() => {
    // If referral code is provided from URL, try to apply it automatically
    if (referralCodeFromUrl && user?.id) {
      handleApplyCode(referralCodeFromUrl);
    }
  }, [referralCodeFromUrl, user?.id]);

  const handleApplyCode = async (code?: string) => {
    const codeToApply = code || promoCode.trim().toUpperCase();
    
    if (!codeToApply) {
      setError('Please enter a promo code');
      return;
    }

    if (!user?.id) {
      setError('Please sign in first');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate the code first
      const validation = await validateReferralCode(codeToApply);
      
      if (!validation.isValid) {
        setError('Invalid promo code. Please check and try again.');
        setLoading(false);
        return;
      }

      if (validation.referrerId === user.id) {
        setError('You cannot use your own referral code');
        setLoading(false);
        return;
      }

      // Apply the referral code
      const result = await applyReferralCode(codeToApply, user.id, {
        ipAddress: undefined, // Will be captured by backend if needed
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
        deviceFingerprint: typeof window !== 'undefined' ? 
          btoa(`${navigator.userAgent}${screen.width}x${screen.height}${Intl.DateTimeFormat().resolvedOptions().timeZone}`) : 
          undefined,
      });

      if (result.success) {
        setSuccess(true);
        setAppliedCode(codeToApply);
        setPromoCode('');
        // Keep modal open for a moment to show success, then auto-close
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Failed to apply promo code');
      }
    } catch (err) {
      console.error('Error applying referral code:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#000] rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Welcome to DeckFix
          </h2>
          <p className="text-slate-600">
            You have a promo code? Enter it for 50 free extra credits.
          </p>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-green-600 font-semibold mb-2">
              Promo code applied successfully!
            </p>
            <p className="text-sm text-slate-600">
              You'll receive 50 credits when you complete your first pitch deck analysis.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label htmlFor="promo-code" className="block text-sm font-medium text-slate-700 mb-2">
                Promo Code
              </label>
              <div className="flex gap-2">
                <input
                  id="promo-code"
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      handleApplyCode();
                    }
                  }}
                  placeholder="DECKFIX-XXXXXX"
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  disabled={loading}
                />
                <button
                  onClick={() => handleApplyCode()}
                  disabled={loading || !promoCode.trim()}
                  className="px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Applying...
                    </>
                  ) : (
                    'Apply'
                  )}
                </button>
              </div>
              {error && (
                <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Share your link to your friends</p>
                  <p className="text-blue-700">
                    You all get 50 free extra credit any time they join via your link or use your promo code.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleContinue}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
              >
                Continue
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

