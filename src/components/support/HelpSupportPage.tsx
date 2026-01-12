import { ArrowLeft, Mail, MessageCircle, BookOpen, Video, FileText, Clock, CheckCircle2 } from 'lucide-react';

interface HelpSupportPageProps {
  onBack: () => void;
}

const supportChannels = [
  {
    icon: Mail,
    title: 'Email Support',
    description: 'Get help via email. We typically respond within 24 hours.',
    contact: 'support@deckfix.ai',
    action: 'Send Email',
    href: 'mailto:support@deckfix.ai'
  },
  {
    icon: MessageCircle,
    title: 'Live Chat',
    description: 'Chat with our support team in real-time (available during business hours).',
    contact: 'Available 9 AM - 6 PM EST',
    action: 'Start Chat',
    href: '#',
    comingSoon: true
  },
  {
    icon: BookOpen,
    title: 'Knowledge Base',
    description: 'Browse our comprehensive guides and tutorials.',
    contact: 'Self-service resources',
    action: 'Browse Articles',
    href: '#',
    comingSoon: true
  }
];

const quickGuides = [
  {
    title: 'Getting Started with DeckFix',
    description: 'Learn how to upload your first pitch deck and understand your analysis results.',
    icon: FileText,
    steps: [
      'Create an account or sign in',
      'Upload your pitch deck PDF',
      'Wait for analysis to complete (2-5 minutes)',
      'Review your detailed feedback and recommendations'
    ]
  },
  {
    title: 'Understanding Your Analysis',
    description: 'Learn how to interpret your analysis results and use them to improve your pitch deck.',
    icon: BookOpen,
    steps: [
      'Review your investment readiness score',
      'Check for deal breakers and red flags',
      'Read slide-by-slide feedback',
      'Implement recommended improvements'
    ]
  },
  {
    title: 'Managing Credits',
    description: 'Learn how the credit system works and how to get more credits.',
    icon: CheckCircle2,
    steps: [
      'Each page costs 1 credit to analyze',
      'Credits reset based on your subscription plan',
      'Earn free credits through referrals',
      'Upgrade your plan for more credits'
    ]
  }
];

const commonIssues = [
  {
    issue: 'Analysis failed or stuck',
    solution: 'Try refreshing the page. If the issue persists, check that your PDF is not corrupted and is in a supported format. Contact support if the problem continues.',
    icon: Clock
  },
  {
    issue: 'Not receiving analysis results',
    solution: 'Check your dashboard for the analysis status. If it shows as completed but you can\'t see results, try refreshing the page or contact support.',
    icon: FileText
  },
  {
    issue: 'Credits not deducted correctly',
    solution: 'Credits are deducted when analysis starts. If you believe there\'s an error, check your credit history and contact support with details.',
    icon: CheckCircle2
  },
  {
    issue: 'Can\'t upload PDF file',
    solution: 'Ensure your file is in PDF format and under 50MB. Check your internet connection and try again. If the problem persists, contact support.',
    icon: Mail
  }
];

export function HelpSupportPage({ onBack }: HelpSupportPageProps) {
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

        {/* Header */}
        <div className="text-center mb-12" id="help-support">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Help & Support
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            We're here to help you succeed. Get the support you need to make the most of DeckFix.
          </p>
        </div>

        {/* Support Channels */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Get in Touch</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {supportChannels.map((channel, index) => {
              const Icon = channel.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all"
                >
                  <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{channel.title}</h3>
                  <p className="text-slate-600 mb-4">{channel.description}</p>
                  <p className="text-sm text-slate-500 mb-4">{channel.contact}</p>
                  {channel.comingSoon ? (
                    <button
                      disabled
                      className="w-full px-4 py-2 bg-slate-100 text-slate-400 rounded-lg font-medium cursor-not-allowed"
                    >
                      {channel.action} (Coming Soon)
                    </button>
                  ) : (
                    <a
                      href={channel.href}
                      className="block w-full px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors text-center"
                    >
                      {channel.action}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick Guides */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickGuides.map((guide, index) => {
              const Icon = guide.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-lg border border-slate-200 p-6"
                >
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-slate-900" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{guide.title}</h3>
                  <p className="text-slate-600 mb-4">{guide.description}</p>
                  <ol className="space-y-2">
                    {guide.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="flex-shrink-0 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                          {stepIndex + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>

        {/* Common Issues */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Common Issues & Solutions</h2>
          <div className="space-y-4">
            {commonIssues.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-slate-900" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.issue}</h3>
                      <p className="text-slate-600">{item.solution}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Video Tutorials Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Video Tutorials</h2>
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-slate-900" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Watch & Learn</h3>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              Video tutorials are coming soon! We're working on comprehensive video guides to help you master DeckFix.
            </p>
            <button
              disabled
              className="px-6 py-3 bg-slate-100 text-slate-400 rounded-lg font-medium cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        </section>

        {/* Contact Information */}
        <section className="bg-slate-900 rounded-2xl p-8 md:p-12 text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">Need More Help?</h2>
          <p className="text-slate-300 mb-8 text-center max-w-2xl mx-auto">
            Our support team is available to assist you. Reach out through any of the channels below, and we'll get back to you as soon as possible.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <Mail className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              <h3 className="font-semibold mb-2">Email</h3>
              <a href="mailto:support@deckfix.ai" className="text-slate-300 hover:text-white transition-colors">
                support@deckfix.ai
              </a>
            </div>
            <div className="text-center">
              <Clock className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              <h3 className="font-semibold mb-2">Response Time</h3>
              <p className="text-slate-300">Within 24 hours</p>
            </div>
            <div className="text-center">
              <MessageCircle className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              <h3 className="font-semibold mb-2">Business Hours</h3>
              <p className="text-slate-300">9 AM - 6 PM EST</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-700 text-center">
            <p className="text-slate-400 text-sm mb-2">DeckFix by Planmoni, Inc.</p>
            <p className="text-slate-400 text-sm">
              8345 Northwest 66th Street, Miami, FL 33195, United States
            </p>
            <p className="text-slate-400 text-sm mt-2">
              Phone: <a href="tel:+17402141009" className="hover:text-white transition-colors">+1 740 214 1009</a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

