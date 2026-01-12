import { ArrowLeft, Video, DollarSign, Users, TrendingUp, CheckCircle2, Camera, Mic, FileText, Sparkles, Zap } from 'lucide-react';

interface CreatorsPageProps {
  onBack: () => void;
}

const contentTypes = [
  {
    icon: Video,
    title: 'Founder-Led Content',
    description: 'Share your startup journey, pitch deck creation process, and fundraising experiences',
    pricing: '$500 - $2,000',
    examples: ['YouTube videos', 'TikTok/Instagram Reels', 'LinkedIn videos', 'Podcast appearances']
  },
  {
    icon: Camera,
    title: 'Startup-Related Content',
    description: 'Create content about startup tools, fundraising tips, investor relations, and pitch deck best practices',
    pricing: '$300 - $1,500',
    examples: ['Product reviews', 'How-to guides', 'Case studies', 'Comparison videos']
  },
  {
    icon: Sparkles,
    title: 'Tech UGC Content',
    description: 'User-generated content showcasing DeckFix features, analysis results, and success stories',
    pricing: '$200 - $1,000',
    examples: ['Feature showcases', 'Before/after comparisons', 'Testimonials', 'Tutorial content']
  }
];

const benefits = [
  {
    icon: DollarSign,
    title: 'Competitive Rates',
    description: 'We offer competitive sponsorship rates based on your reach and engagement'
  },
  {
    icon: Users,
    title: 'Long-term Partnerships',
    description: 'Build ongoing relationships with recurring sponsorship opportunities'
  },
  {
    icon: TrendingUp,
    title: 'Creative Freedom',
    description: 'We trust your creative vision - create authentic content that resonates with your audience'
  },
  {
    icon: CheckCircle2,
    title: 'Fast Payments',
    description: 'Get paid quickly with transparent payment terms and fast processing'
  }
];

const requirements = [
  'Active creator with engaged audience',
  'Content aligned with startup/entrepreneurship/tech themes',
  'Authentic and honest content creation',
  'Willingness to showcase DeckFix features'
];

const process = [
  {
    step: 1,
    title: 'Apply',
    description: 'Fill out our creator application form with your channel details and content samples'
  },
  {
    step: 2,
    title: 'Review',
    description: 'Our team reviews your application and content to ensure alignment'
  },
  {
    step: 3,
    title: 'Partnership',
    description: 'If approved, we\'ll discuss sponsorship terms and content requirements'
  },
  {
    step: 4,
    title: 'Create & Earn',
    description: 'Create your sponsored content and get paid upon delivery and approval'
  }
];

export function CreatorsPage({ onBack }: CreatorsPageProps) {
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
            <Sparkles className="w-4 h-4" />
            <span>Creator Partnerships</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
            Partner with DeckFix
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            Get paid for creating authentic content about startups, fundraising, and pitch decks. We're looking for creators who share our passion for helping entrepreneurs succeed.
          </p>
          <a
            href="mailto:creators@deckfix.ai?subject=Creator Partnership Application"
            className="inline-flex items-center justify-center px-8 py-4 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all hover:scale-105 shadow-lg"
          >
            <Zap className="w-5 h-5 mr-2" />
            Apply as a Creator
          </a>
        </div>

        {/* Content Types Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Content Types We Sponsor</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {contentTypes.map((type, index) => {
              const Icon = type.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all"
                >
                  <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{type.title}</h3>
                  <p className="text-slate-600 mb-4">{type.description}</p>
                  <div className="bg-slate-50 rounded-lg p-3 mb-4">
                    <div className="text-sm font-semibold text-slate-900 mb-1">Pricing Range:</div>
                    <div className="text-lg font-bold text-slate-900">{type.pricing}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-900 mb-2">Examples:</div>
                    <ul className="space-y-1">
                      {type.examples.map((example, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="w-4 h-4 text-slate-900 flex-shrink-0" />
                          <span>{example}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Benefits Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Why Partner with Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 text-center"
                >
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-slate-900" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{benefit.title}</h3>
                  <p className="text-slate-600 text-sm">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Requirements Section */}
        <section className="mb-16 bg-slate-50 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-6 text-center">What We're Looking For</h2>
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {requirements.map((requirement, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm"
                >
                  <CheckCircle2 className="w-5 h-5 text-slate-900 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{requirement}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-slate-600">
              We value authenticity and quality over follower count. If you create great content that resonates with entrepreneurs and startups, we want to work with you!
            </p>
          </div>
        </section>

        {/* Process Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {process.map((item, index) => (
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

        {/* Pricing Examples */}
        <section className="mb-16 bg-slate-900 rounded-2xl p-8 md:p-12 text-white">
          <h2 className="text-3xl font-bold mb-6 text-center">Pricing Examples</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white/10 rounded-xl p-6">
              <div className="text-2xl font-bold mb-2">YouTube Video</div>
              <div className="text-slate-300 mb-4">5-10 minute review</div>
              <div className="text-3xl font-bold mb-2">$500 - $1,500</div>
              <div className="text-sm text-slate-400">Based on reach & engagement</div>
            </div>
            <div className="bg-white/10 rounded-xl p-6">
              <div className="text-2xl font-bold mb-2">Instagram/TikTok</div>
              <div className="text-slate-300 mb-4">Reel or short video</div>
              <div className="text-3xl font-bold mb-2">$200 - $800</div>
              <div className="text-sm text-slate-400">Based on reach & engagement</div>
            </div>
            <div className="bg-white/10 rounded-xl p-6">
              <div className="text-2xl font-bold mb-2">Blog Post</div>
              <div className="text-slate-300 mb-4">Written review or guide</div>
              <div className="text-3xl font-bold mb-2">$300 - $1,000</div>
              <div className="text-sm text-slate-400">Based on traffic & authority</div>
            </div>
          </div>
          <p className="text-center text-slate-300 mt-8">
            *Pricing is negotiable and depends on your audience size, engagement rate, and content quality. 
            We also offer long-term partnerships with recurring sponsorships.
          </p>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Create Together?</h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join our creator community and get paid for creating authentic content that helps entrepreneurs succeed. 
            We're always looking for talented creators to partner with.
          </p>
          <a
            href="mailto:creators@deckfix.ai?subject=Creator Partnership Application&body=Hi, I'm interested in partnering with DeckFix as a creator. Here's a bit about me and my content:%0D%0A%0D%0AChannel/Platform:%0D%0AFollower Count:%0D%0AContent Type:%0D%0AWhy I'm interested:%0D%0A%0D%0APlease let me know if you'd like to discuss a partnership!"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-all hover:scale-105 shadow-lg"
          >
            <Zap className="w-5 h-5 mr-2" />
            Apply as a Creator
          </a>
          <p className="text-slate-400 text-sm mt-6">
            Questions? Email us at <a href="mailto:creators@deckfix.ai" className="text-white hover:underline">creators@deckfix.ai</a>
          </p>
        </section>
      </div>
    </div>
  );
}

