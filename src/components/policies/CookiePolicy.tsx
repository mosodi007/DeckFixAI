import { ArrowLeft } from 'lucide-react';

interface CookiePolicyProps {
  onBack: () => void;
}

export function CookiePolicy({ onBack }: CookiePolicyProps) {
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
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Cookie Policy</h1>
          <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Introduction</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                This Cookie Policy explains how Planmoni, Inc., doing business as DeckFix ("we," "us," or "our"), uses cookies and similar tracking technologies on our website and services (the "Service") located at deckfix.ai.
              </p>
              <p className="text-slate-700 leading-relaxed">
                By using our Service, you consent to the use of cookies in accordance with this Cookie Policy. If you do not agree to our use of cookies, you should set your browser settings accordingly or discontinue use of our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">2. What Are Cookies?</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                Cookies are small text files that are placed on your device (computer, tablet, or mobile) when you visit a website. Cookies are widely used to make websites work more efficiently and to provide information to website owners.
              </p>
              <p className="text-slate-700 leading-relaxed">
                Cookies can be "persistent" (remain on your device until deleted or expired) or "session" (deleted when you close your browser). We use both types of cookies on our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Types of Cookies We Use</h2>
              
              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">3.1 Essential Cookies</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                These cookies are necessary for the Service to function properly. They enable core functionality such as security, network management, and accessibility. Without these cookies, services you have requested cannot be provided.
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
                <li><strong>Authentication Cookies:</strong> Remember your login status and session information</li>
                <li><strong>Security Cookies:</strong> Help protect against security threats and fraud</li>
                <li><strong>Load Balancing Cookies:</strong> Distribute traffic across servers for optimal performance</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">3.2 Functional Cookies</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                These cookies allow the Service to remember choices you make (such as your language preference or region) and provide enhanced, personalized features.
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                <li><strong>User Interface Cookies:</strong> Remember your interface customizations</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">3.3 Analytics Cookies</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                These cookies help us understand how visitors interact with our Service by collecting and reporting information anonymously. This helps us improve the Service and user experience.
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
                <li><strong>Usage Analytics:</strong> Track pages visited, time spent, and user interactions</li>
                <li><strong>Performance Monitoring:</strong> Identify technical issues and optimize performance</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">3.4 Marketing Cookies</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                These cookies are used to track visitors across websites to display relevant advertisements. They may also be used to limit the number of times you see an advertisement and measure the effectiveness of advertising campaigns.
              </p>
              <p className="text-slate-700 leading-relaxed">
                <strong>Note:</strong> We currently do not use marketing cookies, but may implement them in the future with your consent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Third-Party Cookies</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                In addition to our own cookies, we may also use various third-party cookies to report usage statistics and deliver advertisements. These third parties may include:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li><strong>Supabase:</strong> Authentication and database services (essential cookies)</li>
                <li><strong>Stripe:</strong> Payment processing (essential cookies for transaction security)</li>
                <li><strong>Analytics Providers:</strong> Service usage analytics (with your consent)</li>
              </ul>
              <p className="text-slate-700 leading-relaxed mt-4">
                These third parties may use cookies to collect information about your online activities across different websites. We do not control these third-party cookies, and you should review their privacy policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">5. How We Use Cookies</h2>
              <p className="text-slate-700 leading-relaxed mb-4">We use cookies for the following purposes:</p>
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>To enable essential functionality of the Service</li>
                <li>To authenticate users and maintain secure sessions</li>
                <li>To remember your preferences and settings</li>
                <li>To analyze Service usage and improve performance</li>
                <li>To prevent fraud and enhance security</li>
                <li>To provide personalized content and features</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Managing Cookies</h2>
              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">6.1 Browser Settings</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                Most web browsers allow you to control cookies through their settings. You can set your browser to refuse all cookies, accept only first-party cookies, or delete cookies. However, if you disable cookies, some features of our Service may not function properly.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                Instructions for managing cookies in popular browsers:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
                <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
                <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
                <li><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</li>
                <li><strong>Edge:</strong> Settings → Privacy, search, and services → Cookies and site permissions</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">6.2 Cookie Consent</h3>
              <p className="text-slate-700 leading-relaxed">
                When you first visit our Service, you will be presented with a cookie consent banner. You can accept all cookies, decline non-essential cookies, or manage your preferences. Your consent choices are stored and remembered for future visits.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Cookie Retention</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                Different cookies have different retention periods:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li><strong>Session Cookies:</strong> Deleted when you close your browser</li>
                <li><strong>Authentication Cookies:</strong> Typically expire after 30 days of inactivity or when you log out</li>
                <li><strong>Preference Cookies:</strong> May persist for up to 1 year</li>
                <li><strong>Analytics Cookies:</strong> Typically expire after 2 years</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Do Not Track Signals</h2>
              <p className="text-slate-700 leading-relaxed">
                Our Service does not currently respond to "Do Not Track" (DNT) signals from browsers. However, you can control cookies through your browser settings as described in Section 6. We may implement DNT support in the future.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Updates to This Cookie Policy</h2>
              <p className="text-slate-700 leading-relaxed">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. We will notify you of any material changes by posting the updated Cookie Policy on this page and updating the "Last updated" date. Your continued use of the Service after changes are posted constitutes acceptance of the updated Cookie Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Contact Us</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you have questions about this Cookie Policy or our use of cookies, please contact us:
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

