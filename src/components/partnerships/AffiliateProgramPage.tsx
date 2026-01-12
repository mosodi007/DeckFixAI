import { ArrowLeft, DollarSign, TrendingUp, Users, Clock, CheckCircle2, Share2, BarChart3, Gift, Zap } from 'lucide-react';

interface AffiliateProgramPageProps {
  onBack: () => void;
}

const benefits = [
  {
    icon: DollarSign,
    title: '20% Commission',
    description: 'Earn 20% commission on every sale you refer for a full year'
  },
  {
    icon: TrendingUp,
    title: 'Recurring Revenue',
    description: 'Get paid monthly as long as your referrals stay subscribed'
  },
  {
    icon: Users,
    title: 'No Limits',
    description: 'Unlimited referrals - the more you refer, the more you earn'
  },
  {
    icon: Clock,
    title: '1 Year Duration',
    description: 'Your commission continues for 12 months from each referral'
  },
  {
    icon: Share2,
    title: 'Easy Sharing',
    description: 'Get unique tracking links and promo codes to share'
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    description: 'Track your referrals, earnings, and performance in real-time'
  }
];

const howItWorks = [
  {
    step: 1,
    title: 'Sign Up',
    description: 'Join our affiliate program in just a few clicks. No fees, no commitments.'
  },
  {
    step: 2,
    title: 'Get Your Links',
    description: 'Receive unique tracking links and promo codes to share with your audience.'
  },
  {
    step: 3,
    title: 'Share & Promote',
    description: 'Share DeckFix with your audience through your website, social media, or email.'
  },
  {
    step: 4,
    title: 'Earn Commissions',
    description: 'Get 20% commission on every subscription sale for 12 months.'
  }
];

const faq = [
  {
    question: 'How much can I earn?',
    answer: 'You earn 20% commission on every subscription sale you refer. For example, if someone signs up for a $29/month plan, you earn $5.80 per month for 12 months. There\'s no limit to how much you can earn!'
  },
  {
    question: 'How long do I earn commissions?',
    answer: 'You earn commissions for 12 months (1 year) from the date of each referral\'s first subscription payment. If they upgrade or renew, you continue earning on the new subscription amount.'
  },
  {
    question: 'When do I get paid?',
    answer: 'Commissions are paid monthly, 30 days after the end of each month. For example, January commissions are paid at the end of February. Minimum payout is $50.'
  },
  {
    question: 'How do I track my referrals?',
    answer: 'You\'ll have access to a dedicated affiliate dashboard where you can track all your referrals, see pending and paid commissions, and monitor your performance in real-time.'
  },
  {
    question: 'What payment methods do you support?',
    answer: 'We support payments via PayPal, bank transfer (ACH), and wire transfer. You can set your preferred payment method in your affiliate dashboard.'
  },
  {
    question: 'Are there any requirements to join?',
    answer: 'No specific requirements! Whether you\'re a blogger, YouTuber, podcaster, or entrepreneur, you\'re welcome to join. We just ask that you promote DeckFix authentically and follow our affiliate guidelines.'
  }
];

export function AffiliateProgramPage({ onBack }: AffiliateProgramPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-sm font-medium mb-6">
            <Gift className="w-4 h-4" />
            <span>Earn 20% Commission for 1 Year</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
            DeckFix Affiliate Program
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            Turn your audience into recurring revenue. Earn 20% commission on every subscription sale for a full year. No limits, no caps.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:affiliates@deckfix.ai?subject=Join Affiliate Program"
              className="inline-flex items-center justify-center px-8 py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all hover:scale-105 shadow-lg"
            >
              <Zap className="w-5 h-5 mr-2" />
              Become an Affiliate Today
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-all border-2 border-slate-200"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 text-center">
            <div className="text-3xl font-bold text-slate-900 mb-2">20%</div>
            <div className="text-slate-600">Commission Rate</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 text-center">
            <div className="text-3xl font-bold text-slate-900 mb-2">12 Months</div>
            <div className="text-slate-600">Commission Duration</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 text-center">
            <div className="text-3xl font-bold text-slate-900 mb-2">$50</div>
            <div className="text-slate-600">Minimum Payout</div>
          </div>
        </div>

        {/* Benefits Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Why Join Our Affiliate Program?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all"
                >
                  <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{benefit.title}</h3>
                  <p className="text-slate-600">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 relative"
              >
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 mt-4">{item.title}</h3>
                <p className="text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Commission Example */}
        <section className="mb-16 bg-slate-900 rounded-2xl p-8 md:p-12 text-white">
          <h2 className="text-3xl font-bold mb-6 text-center">Earning Potential Example</h2>
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/10 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold mb-2">10 Referrals</div>
                  <div className="text-slate-300">$29/month plan</div>
                </div>
                <div>
                  <div className="text-2xl font-bold mb-2">20% Commission</div>
                  <div className="text-slate-300">Per referral</div>
                </div>
                <div>
                  <div className="text-2xl font-bold mb-2">$696/year</div>
                  <div className="text-slate-300">Total earnings</div>
                </div>
              </div>
            </div>
            <p className="text-slate-300 text-center">
              With just 10 referrals on our basic plan, you could earn $696 per year in recurring commissions. 
              Scale that up and the earning potential is unlimited!
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {faq.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
              >
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.question}</h3>
                <p className="text-slate-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Earning?</h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join hundreds of affiliates already earning with DeckFix. Start promoting today and turn your audience into recurring revenue.
          </p>
          <a
            href="mailto:affiliates@deckfix.ai?subject=Join Affiliate Program&body=Hi, I'm interested in joining the DeckFix Affiliate Program. Please send me more information."
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-all hover:scale-105 shadow-lg"
          >
            <Zap className="w-5 h-5 mr-2" />
            Become an Affiliate Today
          </a>
          <p className="text-slate-400 text-sm mt-6">
            Questions? Email us at <a href="mailto:affiliates@deckfix.ai" className="text-white hover:underline">affiliates@deckfix.ai</a>
          </p>
        </section>
      </div>
    </div>
  );
}

