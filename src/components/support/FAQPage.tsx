import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface FAQPageProps {
  onBack: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'What is DeckFix?',
    answer: 'DeckFix is an AI-powered platform that analyzes your pitch deck and provides detailed, investor-level feedback. We help startups and entrepreneurs improve their pitch decks by identifying issues, missing elements, and areas for improvement to increase their chances of securing funding.'
  },
  {
    category: 'Getting Started',
    question: 'How does DeckFix analyze my pitch deck?',
    answer: 'DeckFix uses advanced AI technology, including OpenAI\'s Vision API, to analyze your pitch deck PDF. Our AI examines each slide for content, design, messaging, and structure, then provides comprehensive feedback on investment readiness, deal breakers, red flags, and specific recommendations for improvement.'
  },
  {
    category: 'Getting Started',
    question: 'What file formats do you support?',
    answer: 'Currently, we support PDF files. Your pitch deck should be in PDF format for analysis. We recommend ensuring your PDF contains selectable text for best results, though we can also analyze image-based PDFs.'
  },
  {
    category: 'Getting Started',
    question: 'How long does an analysis take?',
    answer: 'Analysis typically takes 2-5 minutes depending on the number of pages in your pitch deck. Once you upload your deck, you\'ll be redirected to your dashboard where you can track the analysis progress. You\'ll receive a notification when the analysis is complete.'
  },
  {
    category: 'Credits & Pricing',
    question: 'How does the credit system work?',
    answer: 'DeckFix operates on a credit-based system. Each page of your pitch deck costs 1 credit to analyze. For example, a 10-page pitch deck will consume 10 credits. Credits are allocated based on your subscription plan and reset according to your plan\'s billing cycle.'
  },
  {
    category: 'Credits & Pricing',
    question: 'What happens if I run out of credits?',
    answer: 'If you run out of credits, you can upgrade your subscription plan to receive more credits, or wait until your next credit refill based on your plan\'s billing cycle. You can also earn free credits through our referral program.'
  },
  {
    category: 'Credits & Pricing',
    question: 'Do unused credits roll over?',
    answer: 'Credit rollover depends on your subscription plan. Some plans allow credits to roll over, while others reset monthly. Check your plan details in the Credits section of your account to see your specific rollover policy.'
  },
  {
    category: 'Credits & Pricing',
    question: 'Can I get a refund?',
    answer: 'Yes, we offer refunds according to our Refund Policy. Monthly subscriptions can be refunded within 7 days of purchase (if less than 50% of credits used), and annual subscriptions within 14 days (if less than 25% of credits used). See our Refund Policy for complete details.'
  },
  {
    category: 'Account & Security',
    question: 'How do I create an account?',
    answer: 'You can create an account by clicking "Sign Up" in the navigation bar. You can sign up with your email and password, or use Google OAuth for quick registration. New accounts receive 100 free credits to get started.'
  },
  {
    category: 'Account & Security',
    question: 'Is my pitch deck data secure?',
    answer: 'Yes, we take data security seriously. Your pitch decks are stored securely on encrypted servers, and we use industry-standard security measures to protect your information. We never share your pitch deck content with third parties except as necessary to provide our analysis service.'
  },
  {
    category: 'Account & Security',
    question: 'Can I delete my account?',
    answer: 'Yes, you can delete your account at any time through your account settings. When you delete your account, all your data, including pitch decks and analysis history, will be permanently deleted in accordance with our Privacy Policy.'
  },
  {
    category: 'Account & Security',
    question: 'How do I change my password?',
    answer: 'You can change your password through your account settings. If you signed up with Google OAuth, you\'ll need to manage your password through your Google account settings.'
  },
  {
    category: 'Analysis & Results',
    question: 'What kind of feedback will I receive?',
    answer: 'You\'ll receive comprehensive feedback including: an overall investment readiness score, identification of deal breakers and red flags, missing critical slides, detailed feedback on each slide, specific recommendations for improvement, and actionable insights from a VC perspective.'
  },
  {
    category: 'Analysis & Results',
    question: 'Can I re-analyze my pitch deck after making changes?',
    answer: 'Yes! You can upload a new version of your pitch deck at any time. Each analysis is independent, so you can track your improvements over time. Simply upload your updated deck and use the required credits for analysis.'
  },
  {
    category: 'Analysis & Results',
    question: 'How accurate is the AI analysis?',
    answer: 'Our AI is trained on thousands of pitch decks and investor feedback patterns. While our analysis provides valuable insights, it should be used as a tool to guide improvements rather than a definitive assessment. We recommend combining our feedback with advice from mentors and investors.'
  },
  {
    category: 'Analysis & Results',
    question: 'Can I download my analysis results?',
    answer: 'Currently, analysis results are viewable within the platform. We\'re working on adding export functionality. For now, you can take screenshots or contact support if you need a copy of your analysis.'
  },
  {
    category: 'Referrals & Credits',
    question: 'How does the referral program work?',
    answer: 'When you refer a friend using your unique referral link or promo code, both you and your friend receive 50 free credits once your friend completes their first pitch deck analysis. There\'s no limit to how many people you can refer!'
  },
  {
    category: 'Referrals & Credits',
    question: 'Where can I find my referral link?',
    answer: 'You can find your referral link and promo code in the "Earn Free Credits" section, accessible from your Credits page or the navigation menu. You can share your link or code with friends to earn credits.'
  },
  {
    category: 'Referrals & Credits',
    question: 'When do I receive referral credits?',
    answer: 'You\'ll receive your 50 referral credits once your referred friend completes their first pitch deck analysis. Credits are automatically added to your account and you\'ll be notified when they\'re credited.'
  },
  {
    category: 'Technical Support',
    question: 'What if my analysis fails?',
    answer: 'If your analysis fails, we\'ll automatically refund the credits used. Please check that your PDF is not corrupted and is in a supported format. If the problem persists, contact our support team for assistance.'
  },
  {
    category: 'Technical Support',
    question: 'The upload is stuck or taking too long. What should I do?',
    answer: 'If your upload appears stuck, try refreshing the page. If the analysis is still in progress, you can check your dashboard for status updates. If the issue persists for more than 10 minutes, contact support and we\'ll investigate.'
  },
  {
    category: 'Technical Support',
    question: 'Can I analyze multiple pitch decks at once?',
    answer: 'Yes, you can upload multiple pitch decks, but each will be analyzed separately and will consume credits independently. You can track all your analyses from your dashboard.'
  },
  {
    category: 'Billing & Subscriptions',
    question: 'How do I cancel my subscription?',
    answer: 'You can cancel your subscription at any time through your account settings or by contacting support. Your subscription will remain active until the end of your current billing period, and you\'ll continue to have access to all features until then.'
  },
  {
    category: 'Billing & Subscriptions',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards and debit cards through our secure payment processor, Stripe. All payments are processed securely and we never store your full credit card information.'
  },
  {
    category: 'Billing & Subscriptions',
    question: 'Can I change my subscription plan?',
    answer: 'Yes, you can upgrade or downgrade your subscription plan at any time through your account settings. Changes will take effect immediately, and billing will be prorated accordingly.'
  }
];

export function FAQPage({ onBack }: FAQPageProps) {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(faqData.map(item => item.category)))];

  const filteredFAQs = selectedCategory === 'All' 
    ? faqData 
    : faqData.filter(item => item.category === selectedCategory);

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Find answers to common questions about DeckFix and how to get the most out of our platform
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQs.map((faq, index) => {
            const globalIndex = faqData.indexOf(faq);
            const isOpen = openItems.has(globalIndex);
            
            return (
              <div
                key={globalIndex}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md"
              >
                <button
                  onClick={() => toggleItem(globalIndex)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 pr-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      {faq.category}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {faq.question}
                    </h3>
                  </div>
                  <div className="flex-shrink-0">
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-0 border-t border-slate-100">
                    <p className="text-slate-700 leading-relaxed mt-4">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still Have Questions Section */}
        <div className="mt-12 bg-slate-900 rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Still Have Questions?
          </h2>
          <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
            Can't find what you're looking for? Our support team is here to help you get the most out of DeckFix.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@deckfix.ai"
              className="inline-flex items-center justify-center px-6 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-colors"
            >
              Contact Support
            </a>
            <button
              onClick={() => {
                const element = document.getElementById('help-support');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="inline-flex items-center justify-center px-6 py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 transition-colors"
            >
              Visit Help Center
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

