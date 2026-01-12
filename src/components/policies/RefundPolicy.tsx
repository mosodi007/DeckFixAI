import { ArrowLeft } from 'lucide-react';

interface RefundPolicyProps {
  onBack: () => void;
}

export function RefundPolicy({ onBack }: RefundPolicyProps) {
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
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Refund Policy</h1>
          <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <div className="prose prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Overview</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                This Refund Policy ("Policy") governs refunds for subscriptions and services provided by Planmoni, Inc., doing business as DeckFix ("we," "us," or "our"). By purchasing our services, you agree to this Refund Policy.
              </p>
              <p className="text-slate-700 leading-relaxed">
                We strive to provide high-quality services and customer satisfaction. This Policy outlines the circumstances under which refunds may be issued and the procedures for requesting refunds.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Subscription Refunds</h2>
              
              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">2.1 Monthly Subscriptions</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                <strong>Refund Eligibility:</strong> You may request a full refund within 7 days of your initial subscription purchase, provided you have not consumed more than 50% of your allocated credits.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                <strong>Partial Refunds:</strong> After the 7-day period, refunds are not available for monthly subscriptions. However, you may cancel your subscription at any time, and it will not renew at the end of the current billing period.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">2.2 Annual Subscriptions</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                <strong>Refund Eligibility:</strong> You may request a full refund within 14 days of your annual subscription purchase, provided you have not consumed more than 25% of your allocated credits.
              </p>
              <p className="text-slate-700 leading-relaxed mb-4">
                <strong>Pro-rated Refunds:</strong> After the 14-day period, we may offer pro-rated refunds for the remaining unused portion of your annual subscription, calculated on a monthly basis, minus a 10% processing fee. Pro-rated refunds are evaluated on a case-by-case basis.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Credit-Based Services</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                Our Service operates on a credit-based system. The following applies to credit refunds:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li><strong>Unused Credits:</strong> Unused subscription credits are not refundable, except as provided in Section 2.</li>
                <li><strong>Consumed Credits:</strong> Credits that have been used for pitch deck analysis or other services are non-refundable.</li>
                <li><strong>Credit Expiration:</strong> Credits expire according to your subscription plan terms. Expired credits are not refundable.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Service Issues and Technical Problems</h2>
              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">4.1 Service Failures</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                If our Service fails to deliver analysis results due to a technical error on our part, we will:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
                <li>Refund the credits consumed for the failed analysis</li>
                <li>Provide a replacement analysis at no additional cost</li>
                <li>Investigate and resolve the technical issue</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">4.2 File Format Issues</h3>
              <p className="text-slate-700 leading-relaxed">
                If your pitch deck cannot be analyzed due to file format issues or corruption, we will refund the credits consumed. However, we are not responsible for refunds if the file format is clearly stated as unsupported in our documentation.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Refund Request Process</h2>
              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">5.1 How to Request a Refund</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                To request a refund, please contact us:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
                <li>Email: <a href="mailto:support@deckfix.ai" className="text-slate-900 hover:underline">support@deckfix.ai</a></li>
                <li>Include your account email and order/subscription details</li>
                <li>Specify the reason for your refund request</li>
                <li>Provide any relevant documentation or evidence</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">5.2 Refund Processing Time</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                Once your refund request is approved:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>Refunds will be processed within 5-10 business days</li>
                <li>Refunds will be issued to the original payment method used for the purchase</li>
                <li>You will receive an email confirmation when the refund is processed</li>
                <li>It may take additional time for the refund to appear in your account, depending on your payment provider</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Non-Refundable Items</h2>
              <p className="text-slate-700 leading-relaxed mb-4">The following are not eligible for refunds:</p>
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>Credits that have been consumed for analysis or other services</li>
                <li>Subscriptions that have been active for more than the refund period specified in Section 2</li>
                <li>Services that have been successfully delivered, even if you are not satisfied with the results</li>
                <li>Refund requests made after the applicable refund period has expired</li>
                <li>Refunds for accounts that have been terminated due to violation of our Terms of Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Chargebacks and Disputes</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you initiate a chargeback or dispute with your payment provider without first contacting us, we reserve the right to:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>Immediately suspend or terminate your account</li>
                <li>Dispute the chargeback with your payment provider</li>
                <li>Refuse future service to you</li>
              </ul>
              <p className="text-slate-700 leading-relaxed mt-4">
                We encourage you to contact us first to resolve any issues before initiating a chargeback, as we are committed to resolving disputes amicably.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Subscription Cancellation</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                You may cancel your subscription at any time through your account settings or by contacting us. Cancellation will:
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-2">
                <li>Prevent automatic renewal at the end of your current billing period</li>
                <li>Allow you to continue using the Service until the end of your paid period</li>
                <li>Not result in a refund for the current billing period (unless eligible under Section 2)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Special Circumstances</h2>
              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">9.1 Duplicate Charges</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you are charged twice for the same subscription or service, we will immediately refund the duplicate charge upon verification.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">9.2 Billing Errors</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you are charged an incorrect amount, we will refund the difference or correct the charge, as applicable.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">9.3 Exceptional Cases</h3>
              <p className="text-slate-700 leading-relaxed">
                We may, at our sole discretion, provide refunds in exceptional circumstances not covered by this Policy. Such refunds will be evaluated on a case-by-case basis.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Changes to This Policy</h2>
              <p className="text-slate-700 leading-relaxed">
                We reserve the right to modify this Refund Policy at any time. Changes will be effective immediately upon posting on this page. Material changes will be communicated to you via email or through the Service. Your continued use of the Service after changes are posted constitutes acceptance of the modified Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Contact Us</h2>
              <p className="text-slate-700 leading-relaxed mb-4">
                If you have questions about this Refund Policy or wish to request a refund, please contact us:
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

