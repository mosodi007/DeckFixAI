import { useState, useEffect } from 'react';
import { Check, Zap, CreditCard, Sparkles } from 'lucide-react';
import { getSubscriptionPlans, getCreditPackages, type SubscriptionPlan, type CreditPackage } from '../services/creditService';

export function PricingView() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPricing();
  }, []);

  async function loadPricing() {
    setLoading(true);
    const [loadedPlans, loadedPackages] = await Promise.all([
      getSubscriptionPlans(),
      getCreditPackages(),
    ]);
    setPlans(loadedPlans);
    setPackages(loadedPackages);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-slate-600">Loading pricing...</div>
        </div>
      </div>
    );
  }

  return (
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => {
            const price = billingPeriod === 'monthly' ? plan.priceMonthly : plan.priceAnnual / 12;
            const isPro = index === 2;
            const isFree = index === 0;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 border transition-all hover:shadow-xl ${
                  isPro
                    ? 'bg-slate-900 border-slate-800 transform scale-105 shadow-2xl'
                    : 'bg-white border-slate-200 shadow-lg'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className={`text-2xl font-bold mb-2 ${isPro ? 'text-white' : 'text-slate-900'}`}>
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`text-5xl font-bold ${isPro ? 'text-white' : 'text-slate-900'}`}>
                      ${price.toFixed(2)}
                    </span>
                    <span className={isPro ? 'text-slate-300' : 'text-slate-600'}>/month</span>
                  </div>
                  {billingPeriod === 'annual' && !isFree && (
                    <p className={`text-sm mt-1 ${isPro ? 'text-slate-400' : 'text-slate-500'}`}>
                      Billed ${plan.priceAnnual.toFixed(2)} annually
                    </p>
                  )}
                </div>

                <div className="mb-6 text-center">
                  <div className={`text-3xl font-bold mb-1 ${isPro ? 'text-white' : 'text-slate-900'}`}>
                    {plan.monthlyCredits} credits
                  </div>
                  <p className={`text-sm ${isPro ? 'text-slate-300' : 'text-slate-600'}`}>
                    ~{Math.floor(plan.monthlyCredits / 6)}-{Math.floor(plan.monthlyCredits / 2)} fixes/month
                  </p>
                  <p className={`text-xs mt-1 ${isPro ? 'text-slate-400' : 'text-slate-500'}`}>
                    2-10 credits per fix based on complexity
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isPro ? 'text-blue-400' : 'text-green-600'}`} />
                      <span className={`text-sm ${isPro ? 'text-slate-200' : 'text-slate-700'}`}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    isPro
                      ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  } ${isFree ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isFree}
                >
                  {isFree ? 'Current Plan' : 'Upgrade'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="text-center mb-8">
          <h2 className="text-4xl font-semibold text-slate-900 mb-2 tracking-tight">
            One-Time Credit Packages
          </h2>
          <p className="text-slate-600">
            Buy credits once, use them forever. Never expire.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-400 hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-slate-700" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
                {pkg.name}
              </h3>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {pkg.credits}
                </div>
                <div className="text-sm text-slate-600">credits</div>
              </div>
              <div className="text-center mb-6">
                <div className="text-2xl font-bold text-slate-900">
                  ${pkg.price.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  ${(pkg.price / pkg.credits).toFixed(3)} per credit
                </div>
              </div>
              <button className="w-full py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-all">
                Purchase
              </button>
            </div>
          ))}
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
  );
}
