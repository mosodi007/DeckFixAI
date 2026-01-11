import { useState, useEffect } from 'react';
import { Check, ChevronDown, Mail, Sparkles, Loader2 } from 'lucide-react';
import { getProCreditTiers, formatCredits, type ProCreditTier } from '../services/creditService';
import { ContactSalesModal } from './ContactSalesModal';
import { redirectToCheckout, getSuccessUrl, getCancelUrl } from '../services/stripeService';
import { useAuth } from '../contexts/AuthContext';

export function PricingView() {
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [proTiers, setProTiers] = useState<ProCreditTier[]>([]);
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPricing();
  }, []);

  async function loadPricing() {
    setLoading(true);
    const tiers = await getProCreditTiers();
    setProTiers(tiers);
    setLoading(false);
  }

  async function handleUpgradeToPro() {
    if (!user) {
      setError('Please log in to upgrade');
      return;
    }

    if (!selectedTier) {
      setError('Please select a credit tier');
      return;
    }

    const priceId = billingPeriod === 'monthly'
      ? selectedTier.stripePriceIdMonthly
      : selectedTier.stripePriceIdAnnual;

    if (!priceId) {
      setError('Pricing not configured for this tier. Please contact support.');
      return;
    }

    setCheckoutLoading(true);
    setError(null);

    try {
      await redirectToCheckout({
        priceId,
        mode: 'subscription',
        successUrl: getSuccessUrl('/dashboard'),
        cancelUrl: getCancelUrl('/pricing'),
      });
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setCheckoutLoading(false);
    }
  }

  const selectedTier = proTiers[selectedTierIndex];
  const proPrice = selectedTier
    ? billingPeriod === 'monthly'
      ? selectedTier.priceMonthly
      : selectedTier.priceAnnual / 12
    : 0;
  const proBilledAmount = selectedTier
    ? billingPeriod === 'monthly'
      ? selectedTier.priceMonthly
      : selectedTier.priceAnnual
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-slate-600">Loading pricing...</div>
        </div>
      </div>
    );
  }

  const freeFeatures = [
    '100 credits per month',
    'Basic slide fixes',
    'Community support',
    'Standard processing speed',
  ];

  const proFeatures = [
    'Monthly credit allocation',
    'Priority processing',
    'Email support',
    'Advanced analytics',
    'No daily limits',
    billingPeriod === 'annual' ? '20% savings vs monthly' : 'Upgrade anytime',
  ];

  const customFeatures = [
    'Custom credit allocation',
    'Dedicated account manager',
    'Priority support',
    'Custom integrations',
    'Volume discounts',
    'Flexible billing',
  ];

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-semibold text-slate-900 mb-4 tracking-tighter">
              Choose Your Plan
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
              Dynamic pricing based on fix complexity. Pay only for what you use.
            </p>

            <div className="inline-flex items-center bg-white rounded-full p-1 border border-slate-200 shadow-sm">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  billingPeriod === 'annual'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Annual
                <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="relative rounded-2xl p-8 border bg-white border-slate-200 shadow-lg transition-all hover:shadow-xl">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2 text-slate-900">Free</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-slate-900">$0</span>
                  <span className="text-slate-600">/month</span>
                </div>
              </div>

              <div className="mb-6 text-center">
                <div className="text-3xl font-bold mb-1 text-slate-900">100 credits</div>
                <p className="text-sm text-slate-600">
                  ~16-50 fixes/month
                </p>
                <p className="text-xs mt-1 text-slate-500">
                  2-10 credits per fix based on complexity
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {freeFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
                    <span className="text-sm text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button className="w-full py-3 rounded-xl font-semibold transition-all bg-slate-900 text-white hover:bg-slate-800 opacity-50 cursor-not-allowed" disabled>
                Current Plan
              </button>
            </div>

            <div className="relative rounded-2xl p-8 border bg-slate-900 border-slate-800 transform scale-105 shadow-2xl transition-all hover:shadow-3xl">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                  POPULAR
                </span>
              </div>

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2 text-white">Pro</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-white">
                    ${proPrice.toFixed(2)}
                  </span>
                  <span className="text-slate-300">/month</span>
                </div>
                {billingPeriod === 'annual' && (
                  <p className="text-sm mt-1 text-slate-400">
                    Billed ${proBilledAmount.toFixed(2)} annually
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Monthly Credits
                </label>
                <div className="relative">
                  <select
                    value={selectedTierIndex}
                    onChange={(e) => setSelectedTierIndex(Number(e.target.value))}
                    className="w-full px-4 py-3 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-white font-semibold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    {proTiers.map((tier, index) => (
                      <option key={tier.id} value={index}>
                        {formatCredits(tier.credits)} credits/month
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
                {selectedTier && (
                  <div className="mt-2 text-center">
                    <p className="text-sm text-slate-300">
                      ~{Math.floor(selectedTier.credits / 6)}-{Math.floor(selectedTier.credits / 2)} fixes/month
                    </p>
                    <p className="text-xs mt-1 text-slate-400">
                      ${((billingPeriod === 'monthly' ? selectedTier.priceMonthly : selectedTier.priceAnnual / 12) / selectedTier.credits * 1000).toFixed(2)} per 1,000 credits
                    </p>
                  </div>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {proFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-400" />
                    <span className="text-sm text-slate-200">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={handleUpgradeToPro}
                disabled={checkoutLoading || !user}
                className="w-full py-3 rounded-xl font-semibold transition-all bg-blue-500 text-white hover:bg-blue-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Upgrade to Pro'
                )}
              </button>
              {!user && (
                <p className="text-xs text-center mt-2 text-slate-400">
                  Please log in to upgrade
                </p>
              )}
            </div>

            <div className="relative rounded-2xl p-8 border bg-white border-slate-200 shadow-lg transition-all hover:shadow-xl">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2 text-slate-900">Custom</h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-3xl font-bold text-slate-900">Contact Sales</span>
                </div>
                <p className="text-sm text-slate-600">For teams and enterprises</p>
              </div>

              <div className="mb-6 text-center py-4">
                <div className="text-lg font-semibold text-slate-900 mb-1">Custom Allocation</div>
                <p className="text-sm text-slate-600">
                  Tailored to your needs
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {customFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
                    <span className="text-sm text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setShowContactModal(true)}
                className="w-full py-3 rounded-xl font-semibold transition-all bg-slate-900 text-white hover:bg-slate-800 flex items-center justify-center gap-2"
              >
                <Mail className="w-5 h-5" />
                Contact Sales
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-slate-900" />
              How Credit Pricing Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">2-3</span>
                  </div>
                  <h4 className="font-semibold text-slate-900">Low Complexity</h4>
                </div>
                <p className="text-sm text-slate-700">
                  Simple fixes: 1-2 minor issues, short content, spelling or grammar corrections
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">4-6</span>
                  </div>
                  <h4 className="font-semibold text-slate-900">Medium Complexity</h4>
                </div>
                <p className="text-sm text-slate-700">
                  Moderate fixes: 3-4 issues, medium content length, structural improvements
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">7-10</span>
                  </div>
                  <h4 className="font-semibold text-slate-900">High Complexity</h4>
                </div>
                <p className="text-sm text-slate-700">
                  Complex fixes: 5+ issues, long content, critical severity, major rewrites
                </p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-sm text-slate-700">
                <strong className="text-slate-900">Fair & Transparent:</strong> You always see the estimated cost before generating a fix.
                We analyze issue count, severity, content length, and required changes to calculate a fair price.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ContactSalesModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </>
  );
}
