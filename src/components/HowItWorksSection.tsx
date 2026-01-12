import { Upload, FileText, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

export function HowItWorksSection() {
  const steps = [
    {
      number: 1,
      icon: Upload,
      title: 'Upload Your Pitch Deck',
      description: 'Simply drag and drop your PDF pitch deck or choose a file. Our system accepts PDF files up to 50MB. Get started in seconds.',
    },
    {
      number: 2,
      icon: FileText,
      title: 'AI Analysis in Progress',
      description: 'Our advanced AI analyzes your deck using VC-standard criteria. We evaluate clarity, market opportunity, business model, team strength, and financial projections.',
    },
    {
      number: 3,
      icon: Sparkles,
      title: 'Get Comprehensive Feedback',
      description: 'Receive detailed, brutally honest feedback from an investor\'s perspective. See your overall score, identify deal breakers, red flags, and areas for improvement.',
    },
    {
      number: 4,
      icon: CheckCircle2,
      title: 'Apply Instant Fixes',
      description: 'Get AI-generated fixes for each slide with specific recommendations. Make your pitch deck investor-ready with actionable improvements you can implement immediately.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Transform your pitch deck in just four simple steps
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative">
                  {/* Arrow connector for desktop - only show between rows */}
                  {index % 2 === 0 && index < steps.length - 1 && (
                    <div className="hidden md:flex absolute top-1/2 left-full items-center justify-center z-0 transform -translate-y-1/2" style={{ width: 'calc((100% - 3rem) / 2)', marginLeft: '-1.5rem' }}>
                      <div className="flex-1 h-0.5 bg-slate-300"></div>
                      <ArrowRight className="w-6 h-6 text-slate-400 mx-2" />
                      <div className="flex-1 h-0.5 bg-slate-300"></div>
                    </div>
                  )}

                  {/* Vertical arrow for second column items */}
                  {index === 1 && (
                    <div className="hidden md:flex absolute -bottom-8 left-1/2 transform -translate-x-1/2 items-center justify-center z-0 flex-col">
                      <div className="w-0.5 h-8 bg-slate-300"></div>
                      <ArrowRight className="w-6 h-6 text-slate-400 rotate-90 my-1" />
                      <div className="w-0.5 h-8 bg-slate-300"></div>
                    </div>
                  )}

                  {/* Step Card */}
                  <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10 lg:p-12 h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative z-10">
                    {/* Step Number Badge */}
                    <div className="mb-8">
                      <div className="w-20 h-20 bg-slate-900 rounded-xl flex items-center justify-center">
                        <span className="text-3xl font-bold text-white">{step.number}</span>
                      </div>
                    </div>

                    {/* Icon */}

                    {/* Content */}
                    <h3 className="text-xl font-semibold text-slate-900 mb-4">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-md">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">AI-Powered Analysis</h3>
            <p className="text-sm text-slate-600">
              Trained on thousands of successful pitch decks from funded startups. Get VC-level insights instantly.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Comprehensive Scoring</h3>
            <p className="text-sm text-slate-600">
              Detailed evaluation across multiple dimensions: clarity, design, content, structure, and investor readiness.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">Actionable Recommendations</h3>
            <p className="text-sm text-slate-600">
              Get specific fixes for each slide. No generic advice—just concrete improvements you can implement right away.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-slate-900 rounded-2xl p-12 text-white">
            <h3 className="text-3xl font-bold mb-4">
              Ready to get started?
            </h3>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              Join hundreds of startups using DeckFix to improve their pitch decks and increase their chances of securing funding.
            </p>
            <button
              onClick={() => {
                window.location.href = '/signup';
              }}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-all hover:scale-105 shadow-lg"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

