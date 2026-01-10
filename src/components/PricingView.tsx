import { useState, useEffect } from 'react';
import { Check, Zap, CreditCard } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-white">Loading pricing...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Dynamic pricing based on fix complexity. Pay only for what you use.
          </p>

          <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full p-1 border border-white/20">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-purple-900'
                  : 'text-white hover:text-gray-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                billingPeriod === 'annual'
                  ? 'bg-white text-purple-900'
                  : 'text-white hover:text-gray-200'
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
                className={`relative rounded-2xl p-8 ${
                  isPro
                    ? 'bg-gradient-to-br from-purple-600 to-pink-600 border-2 border-purple-400 transform scale-105'
                    : 'bg-white/10 backdrop-blur-sm border border-white/20'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-yellow-400 text-purple-900 px-4 py-1 rounded-full text-sm font-bold">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-white">
                      ${price.toFixed(2)}
                    </span>
                    <span className="text-gray-300">/month</span>
                  </div>
                  {billingPeriod === 'annual' && !isFree && (
                    <p className="text-sm text-gray-300 mt-1">
                      Billed ${plan.priceAnnual.toFixed(2)} annually
                    </p>
                  )}
                </div>

                <div className="mb-6 text-center">
                  <div className="text-3xl font-bold text-white mb-1">
                    {plan.monthlyCredits} credits
                  </div>
                  <p className="text-sm text-gray-300">
                    ~{Math.floor(plan.monthlyCredits / 6)}-{Math.floor(plan.monthlyCredits / 2)} fixes/month
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    2-10 credits per fix based on complexity
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-200 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    isPro
                      ? 'bg-white text-purple-900 hover:bg-gray-100'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  } ${isFree ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isFree}
                >
                  {isFree ? 'Current Plan' : 'Get Started'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            One-Time Credit Packages
          </h2>
          <p className="text-gray-300">
            Buy credits once, use them forever. Never expire.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:border-purple-400 transition-all"
            >
              <div className="flex items-center justify-center mb-4">
                <CreditCard className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">
                {pkg.name}
              </h3>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-white mb-1">
                  {pkg.credits}
                </div>
                <div className="text-sm text-gray-300">credits</div>
              </div>
              <div className="text-center mb-6">
                <div className="text-2xl font-bold text-purple-400">
                  ${pkg.price.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  ${(pkg.price / pkg.credits).toFixed(3)} per credit
                </div>
              </div>
              <button className="w-full py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all">
                Purchase
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Zap className="w-6 h-6 text-yellow-400" />
            How Credit Pricing Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-200">
            <div>
              <h4 className="font-semibold text-white mb-2">Low Complexity (2-3 credits)</h4>
              <p className="text-sm">
                Simple fixes: 1-2 minor issues, short content, spelling or grammar corrections
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Medium Complexity (4-6 credits)</h4>
              <p className="text-sm">
                Moderate fixes: 3-4 issues, medium content length, structural improvements
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">High Complexity (7-10 credits)</h4>
              <p className="text-sm">
                Complex fixes: 5+ issues, long content, critical severity, major rewrites
              </p>
            </div>
          </div>
          <div className="mt-6 p-4 bg-purple-900/30 rounded-lg">
            <p className="text-sm text-gray-300">
              <strong className="text-white">Fair & Transparent:</strong> You always see the estimated cost before generating a fix.
              We analyze issue count, severity, content length, and required changes to calculate a fair price.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
