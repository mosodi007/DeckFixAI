import { useState } from 'react';
import { Check, Sparkles, Zap, TrendingUp, Shield, ArrowRight, ChevronDown } from 'lucide-react';

interface PricingPagePublicProps {
  onSignUp: () => void;
}

interface PricingTier {
  id: string;
  credits: number;
  priceMonthly: number;
  priceAnnual: number;
}

export function PricingPagePublic({ onSignUp }: PricingPagePublicProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');
  const [selectedTierIndex, setSelectedTierIndex] = useState(1); // Default to 1000 credits

  // Hardcoded pricing data matching the database
  const freePlan = {
    name: 'Free',
    credits: 100,
    price: 0,
  };

  const proTiers: PricingTier[] = [
    { id: '1', credits: 500, priceMonthly: 9.99, priceAnnual: 95.90 },
    { id: '2', credits: 1000, priceMonthly: 17.99, priceAnnual: 172.70 },
    { id: '3', credits: 2000, priceMonthly: 33.99, priceAnnual: 326.30 },
    { id: '4', credits: 5000, priceMonthly: 74.99, priceAnnual: 719.90 },
    { id: '5', credits: 10000, priceMonthly: 139.99, priceAnnual: 1343.90 },
  ];

  const selectedTier = proTiers[selectedTierIndex];
  const selectedPrice = billingPeriod === 'monthly' 
    ? selectedTier.priceMonthly 
    : selectedTier.priceAnnual;
  const monthlyEquivalent = billingPeriod === 'annual' 
    ? selectedTier.priceAnnual / 12 
    : selectedTier.priceMonthly;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatCredits = (credits: number) => {
    return credits.toLocaleString();
  };

  const calculateSavings = (monthly: number, annual: number) => {
    const monthlyTotal = monthly * 12;
    const savings = monthlyTotal - annual;
    const percentage = Math.round((savings / monthlyTotal) * 100);
    return { savings, percentage };
  };

  const savings = billingPeriod === 'annual' 
    ? calculateSavings(selectedTier.priceMonthly, selectedTier.priceAnnual) 
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Simple, Transparent Pricing</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Get VC-level feedback on your pitch deck. Start free, upgrade when you're ready.
          </p>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 -mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Free Plan Card */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Free</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-900">$0</span>
                <span className="text-slate-600">/month</span>
              </div>
              <p className="text-slate-600 text-sm mt-2">{freePlan.credits} credits/month</p>
            </div>

            <button
              onClick={onSignUp}
              className="w-full py-3 px-6 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors mb-6"
            >
              Get Started Free
            </button>

            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 text-sm">100 credits per month</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 text-sm">Basic pitch deck analysis</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 text-sm">VC-level feedback</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 text-sm">Issue identification</span>
              </li>
            </ul>
          </div>

          {/* Pro Plan Card with Dropdown */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1 bg-blue-600 text-white text-xs font-bold rounded-bl-lg">
              Most Popular
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <p className="text-slate-300 text-sm mb-4">Choose your credit tier</p>

              {/* Billing Toggle */}
              <div className="flex items-center justify-center gap-4 mb-6 p-3 bg-slate-800/50 rounded-lg">
                <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-white' : 'text-slate-400'}`}>
                  Monthly
                </span>
                <button
                  onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    billingPeriod === 'annual' ? 'bg-blue-600' : 'bg-slate-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      billingPeriod === 'annual' ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${billingPeriod === 'annual' ? 'text-white' : 'text-slate-400'}`}>
                  Annual
                </span>
                {billingPeriod === 'annual' && savings && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs font-semibold">
                    Save {savings.percentage}%
                  </span>
                )}
              </div>

              {/* Credit Tier Dropdown */}
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
                      ~{Math.floor(selectedTier.credits / 6)}-{Math.floor(selectedTier.credits / 2)} pitch decks/month
                    </p>
                    <p className="text-xs mt-1 text-slate-400">
                      {formatPrice((monthlyEquivalent / selectedTier.credits) * 1000)} per 1,000 credits
                    </p>
                  </div>
                )}
              </div>

              {/* Price Display */}
              <div className="mb-6 p-4 bg-slate-800/50 rounded-lg text-center">
                <div className="flex items-baseline justify-center gap-2 mb-2">
                  <span className="text-5xl font-bold">{formatPrice(monthlyEquivalent)}</span>
                  <span className="text-slate-300">/Month</span>
                </div>
                {billingPeriod === 'annual' && (
                  <p className="text-slate-400 text-sm mt-1">
                    Billed {formatPrice(selectedPrice)} annually
                  </p>
                )}
                {billingPeriod === 'annual' && savings && (
                  <p className="text-green-400 text-xs mt-1 font-semibold">
                    Save {formatPrice(savings.savings)} vs monthly billing
                  </p>
                )}
              </div>

              <button
                onClick={onSignUp}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg mb-6"
              >
                Get Started
              </button>

              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300 text-sm">
                    {formatCredits(selectedTier.credits)} credits per month
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300 text-sm">All Free features</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300 text-sm">Priority analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300 text-sm">Advanced insights</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300 text-sm">Email support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Enterprise/Custom Plan */}
        <div className="mt-12 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                <h3 className="text-3xl font-bold mb-3">Need More? Custom Plans Available</h3>
                <p className="text-slate-300 mb-4">
                  For teams and high-volume users. Get custom credit allocations, dedicated support, and volume discounts.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>Custom credit allocation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>Dedicated account manager</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-400" />
                    <span>Volume discounts</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => window.location.href = 'mailto:support@deckfix.ai?subject=Custom Plan Inquiry'}
                className="px-8 py-4 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                Contact Sales
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Comparison */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Everything You Need</h2>
          <p className="text-xl text-slate-600">All plans include our core features</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">AI-Powered Analysis</h3>
            <p className="text-slate-600">
              Get instant, comprehensive feedback on your pitch deck using advanced AI technology.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">VC-Level Insights</h3>
            <p className="text-slate-600">
              Receive brutally honest feedback from an investor's perspective to improve your chances.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Secure & Private</h3>
            <p className="text-slate-600">
              Your pitch decks are encrypted and never shared. Your data stays private and secure.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">How do credits work?</h3>
            <p className="text-slate-600">
              Each page of your pitch deck costs 1 credit to analyze. Credits reset monthly on your billing date.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Can I change plans later?</h3>
            <p className="text-slate-600">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">What happens if I run out of credits?</h3>
            <p className="text-slate-600">
              You can purchase additional credits or upgrade to a higher tier. Unused credits roll over to the next month.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Is there a free trial?</h3>
            <p className="text-slate-600">
              Yes! The Free plan includes 100 credits per month, perfect for trying out our service.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of startups getting better pitch deck feedback
          </p>
          <button
            onClick={onSignUp}
            className="px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-slate-100 transition-colors inline-flex items-center gap-2"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
