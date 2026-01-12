import { ArrowLeft } from 'lucide-react';

interface TermsAndConditionsProps {
  onBack: () => void;
}

export function TermsAndConditions({ onBack }: TermsAndConditionsProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 md:p-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Terms & Conditions</h1>
          <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Agreement to Terms</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                These Terms and Conditions ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and Planmoni, Inc., doing business as DeckFix ("Company," "we," "us," or "our"), concerning your access to and use of the DeckFix website and services (the "Service").
              </p>
              <p className="text-slate-700 leading-relaxed">
                By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these Terms, you may not access or use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Description of Service</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                DeckFix is an AI-powered platform that provides pitch deck analysis, feedback, and optimization services for startups and entrepreneurs. Our Service includes:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>Automated analysis of pitch deck PDFs using artificial intelligence</li>
                <li>Scoring and feedback on various aspects of pitch decks</li>
                <li>Recommendations for improvements and fixes</li>
                <li>Credit-based subscription and usage system</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">3. User Accounts and Registration</h2>
              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">3.1 Account Creation</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                To use certain features of our Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your password and account</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">3.2 Account Eligibility</h3>
              <p className="text-slate-700 leading-relaxed">
                You must be at least 18 years old to create an account. By creating an account, you represent and warrant that you are at least 18 years of age and have the legal capacity to enter into these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Acceptable Use</h2>
              <p className="text-slate-700 leading-relaxed mb-4">You agree not to:</p>
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>Use the Service for any illegal purpose or in violation of any laws</li>
                <li>Upload content that infringes on intellectual property rights of others</li>
                <li>Upload malicious code, viruses, or harmful software</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                <li>Interfere with or disrupt the Service or servers connected to the Service</li>
                <li>Use automated systems (bots, scrapers) to access the Service without permission</li>
                <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
                <li>Resell or redistribute the Service or any part thereof</li>
                <li>Use the Service to compete with us or build a similar service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Intellectual Property Rights</h2>
              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">5.1 Our Intellectual Property</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                The Service, including its original content, features, functionality, design, logos, and trademarks, is owned by Planmoni, Inc. and is protected by United States and international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">5.2 Your Content</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                You retain ownership of any pitch decks and content you upload to the Service ("User Content"). By uploading User Content, you grant us a worldwide, non-exclusive, royalty-free license to:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>Store, process, and analyze your User Content to provide the Service</li>
                <li>Use your User Content to improve our AI models and Service quality (anonymized and aggregated)</li>
                <li>Display your User Content as necessary to provide the Service</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">5.3 Feedback</h3>
              <p className="text-slate-700 leading-relaxed">
                If you provide us with feedback, suggestions, or ideas about the Service, you grant us the right to use, modify, and incorporate such feedback without compensation or attribution to you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Subscription and Payment Terms</h2>
              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">6.1 Subscription Plans</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We offer various subscription plans with different credit allocations. Subscription fees are billed in advance on a monthly or annual basis, as selected by you.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">6.2 Payment</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                All payments are processed through our third-party payment processor (Stripe). You agree to provide current, complete, and accurate purchase and account information. You are responsible for all applicable taxes.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">6.3 Automatic Renewal</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                Subscriptions automatically renew at the end of each billing period unless you cancel before the renewal date. You can cancel your subscription at any time through your account settings.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">6.4 Price Changes</h3>
              <p className="text-slate-700 leading-relaxed">
                We reserve the right to modify subscription prices at any time. Price changes will apply to subsequent billing periods. We will provide notice of price changes via email or through the Service.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">6.5 Refunds</h3>
              <p className="text-slate-700 leading-relaxed">
                Refunds are handled in accordance with our Refund Policy. Please review our Refund Policy for details on refund eligibility and procedures.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Credit System</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                Our Service operates on a credit-based system. Credits are consumed when you use certain features:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
                <li>Pitch deck analysis consumes credits based on the number of pages (1 credit per page)</li>
                <li>Additional features may consume credits as specified in the Service</li>
                <li>Credits are allocated based on your subscription plan</li>
                <li>Unused credits may roll over according to your plan terms</li>
                <li>Credits have no cash value and are non-transferable</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Service Availability and Modifications</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                We reserve the right to:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>Modify, suspend, or discontinue the Service at any time</li>
                <li>Change features, functionality, or pricing</li>
                <li>Impose limits on usage or access</li>
                <li>Perform maintenance that may temporarily interrupt Service availability</li>
              </ul>
              <p className="text-slate-700 leading-relaxed mt-4">
                We will use reasonable efforts to provide advance notice of significant changes or interruptions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Disclaimers</h2>
              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">9.1 Service "As Is"</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF PERFORMANCE.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">9.2 No Investment Advice</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                Our Service provides analysis and feedback on pitch decks. This does not constitute investment, financial, legal, or professional advice. We do not guarantee that following our recommendations will result in securing funding or investment.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">9.3 AI-Generated Content</h3>
              <p className="text-slate-700 leading-relaxed">
                Our Service uses artificial intelligence to generate analysis and recommendations. While we strive for accuracy, AI-generated content may contain errors or inaccuracies. You should review and verify all recommendations before implementing them.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Limitation of Liability</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL PLANMONI, INC., ITS AFFILIATES, AGENTS, DIRECTORS, EMPLOYEES, OR LICENSORS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO THE USE OF, OR INABILITY TO USE, THE SERVICE.
              </p>
              <p className="text-slate-700 leading-relaxed">
                OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THE USE OF OR ANY INABILITY TO USE ANY PORTION OF THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRIOR TO THE EVENT GIVING RISE TO THE LIABILITY, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Indemnification</h2>
              <p className="text-slate-700 leading-relaxed">
                You agree to defend, indemnify, and hold harmless Planmoni, Inc. and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including without limitation reasonable attorney's fees and costs, arising out of or in any way connected with your access to or use of the Service, your violation of these Terms, or your violation of any third-party rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">12. Termination</h2>
              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">12.1 Termination by You</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                You may terminate your account at any time by contacting us or using the account deletion feature in your account settings.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">12.2 Termination by Us</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">12.3 Effect of Termination</h3>
              <p className="text-slate-700 leading-relaxed">
                Upon termination, your right to use the Service will immediately cease. We may delete your account and data, subject to our data retention policies. Provisions of these Terms that by their nature should survive termination shall survive termination.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">13. Governing Law and Dispute Resolution</h2>
              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">13.1 Governing Law</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the State of Florida, United States, without regard to its conflict of law provisions.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">13.2 Dispute Resolution</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                Any disputes arising out of or relating to these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, conducted in Miami-Dade County, Florida. You waive any right to a jury trial or to participate in a class action lawsuit.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">14. Changes to Terms</h2>
              <p className="text-slate-700 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on this page and updating the "Last updated" date. Your continued use of the Service after such changes constitutes acceptance of the modified Terms. If you do not agree to the modified Terms, you must stop using the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">15. Severability</h2>
              <p className="text-slate-700 leading-relaxed">
                If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">16. Entire Agreement</h2>
              <p className="text-slate-700 leading-relaxed">
                These Terms, together with our Privacy Policy and Refund Policy, constitute the entire agreement between you and Planmoni, Inc. regarding the Service and supersede all prior agreements and understandings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">17. Contact Information</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you have any questions about these Terms, please contact us:
              </p>
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <p className="text-slate-900 font-semibold mb-2">DeckFix by Planmoni, Inc.</p>
                <p className="text-slate-700 mb-1">Email: <a href="mailto:support@deckfix.ai" className="text-slate-900 hover:underline">support@deckfix.ai</a></p>
                <p className="text-slate-700 mb-1">Phone: <a href="tel:+17402141009" className="text-slate-900 hover:underline">+1 740 214 1009</a></p>
                <p className="text-slate-700">
                  8345 Northwest 66th Street<br />
                  Miami, FL 33195<br />
                  United States
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

