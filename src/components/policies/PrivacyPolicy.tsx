import { ArrowLeft } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
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
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
          <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Introduction</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                DeckFix by Planmoni, Inc. ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services located at deckfix.ai (the "Service").
              </p>
              <p className="text-slate-700 leading-relaxed">
                By using our Service, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">2.1 Information You Provide</h3>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
                <li><strong>Account Information:</strong> When you create an account, we collect your name, email address, password, and any other information you choose to provide.</li>
                <li><strong>Payment Information:</strong> When you make a purchase, we collect payment information through our third-party payment processor (Stripe). We do not store your full credit card details.</li>
                <li><strong>Pitch Deck Files:</strong> When you upload pitch decks for analysis, we collect and store these files on our secure servers.</li>
                <li><strong>Communication Data:</strong> When you contact us for support, we collect your name, email address, and the content of your messages.</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">2.2 Automatically Collected Information</h3>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
                <li><strong>Usage Data:</strong> We collect information about how you access and use our Service, including your IP address, browser type, device information, pages visited, and time spent on pages.</li>
                <li><strong>Cookies and Tracking Technologies:</strong> We use cookies and similar tracking technologies to track activity on our Service and hold certain information. See our Cookie Policy for more details.</li>
                <li><strong>Log Data:</strong> Our servers automatically record information when you access our Service, including your IP address, browser type, referring/exit pages, and timestamps.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-slate-700 leading-relaxed mb-4">We use the information we collect for the following purposes:</p>
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>To provide, maintain, and improve our Service</li>
                <li>To process your transactions and manage your account</li>
                <li>To analyze your pitch decks and provide feedback and recommendations</li>
                <li>To communicate with you about your account, our services, and updates</li>
                <li>To send you marketing communications (with your consent, which you can opt out of at any time)</li>
                <li>To detect, prevent, and address technical issues and security threats</li>
                <li>To comply with legal obligations and enforce our Terms of Service</li>
                <li>To conduct research and analytics to improve our Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Information Sharing and Disclosure</h2>
              <p className="text-slate-700 leading-relaxed mb-4">We do not sell your personal information. We may share your information in the following circumstances:</p>
              
              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">4.1 Service Providers</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We may share your information with third-party service providers who perform services on our behalf, including:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
                <li>Payment processors (Stripe) for transaction processing</li>
                <li>Cloud hosting providers (Supabase) for data storage and processing</li>
                <li>AI service providers (OpenAI) for pitch deck analysis</li>
                <li>Email service providers for communications</li>
                <li>Analytics providers to help us understand Service usage</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">4.2 Legal Requirements</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or government agency).
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">4.3 Business Transfers</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                If we are involved in a merger, acquisition, or asset sale, your information may be transferred as part of that transaction.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">4.4 With Your Consent</h3>
              <p className="text-slate-700 leading-relaxed">
                We may share your information with your explicit consent or at your direction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Data Security</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security assessments and updates</li>
                <li>Limited access to personal information on a need-to-know basis</li>
              </ul>
              <p className="text-slate-700 leading-relaxed mt-4">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Your Privacy Rights</h2>
              <p className="text-slate-700 leading-relaxed mb-4">Depending on your location, you may have certain rights regarding your personal information:</p>
              
              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">6.1 Access and Portability</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                You have the right to access and receive a copy of your personal information that we hold.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">6.2 Correction</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                You have the right to request correction of inaccurate or incomplete personal information.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">6.3 Deletion</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                You have the right to request deletion of your personal information, subject to certain exceptions (e.g., legal retention requirements).
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">6.4 Opt-Out</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                You can opt out of marketing communications by clicking the unsubscribe link in our emails or contacting us directly.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">6.5 Do Not Track</h3>
              <p className="text-slate-700 leading-relaxed">
                Our Service does not respond to Do Not Track signals. However, you can control cookies through your browser settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Children's Privacy</h2>
              <p className="text-slate-700 leading-relaxed">
                Our Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Data Retention</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal, regulatory, or business purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">9. International Data Transfers</h2>
              <p className="text-slate-700 leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. By using our Service, you consent to the transfer of your information to these countries.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Changes to This Privacy Policy</h2>
              <p className="text-slate-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes. Changes are effective when posted on this page.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Contact Us</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy or wish to exercise your privacy rights, please contact us:
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

