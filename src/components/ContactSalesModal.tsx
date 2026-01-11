import { useState } from 'react';
import { X, Send, CheckCircle } from 'lucide-react';
import { submitContactRequest } from '../services/creditService';

interface ContactSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactSalesModal({ isOpen, onClose }: ContactSalesModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    estimatedUsage: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      setIsSubmitting(false);
      return;
    }

    const result = await submitContactRequest(formData);

    if (result.success) {
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setFormData({
          name: '',
          email: '',
          company: '',
          estimatedUsage: '',
          message: '',
        });
      }, 2000);
    } else {
      setError(result.error || 'Failed to submit request');
    }

    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setError('');
      setIsSuccess(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Contact Sales</h2>
            <p className="text-slate-600 mt-1">
              Let's discuss a custom plan for your needs
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8">
          {isSuccess ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                Request Submitted!
              </h3>
              <p className="text-slate-600">
                Our team will reach out to you shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Your name"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="your.email@company.com"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Your company name"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Estimated Monthly Usage
                </label>
                <select
                  value={formData.estimatedUsage}
                  onChange={(e) => setFormData({ ...formData, estimatedUsage: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white"
                  disabled={isSubmitting}
                >
                  <option value="">Select usage range</option>
                  <option value="10000-25000">10,000 - 25,000 credits/month</option>
                  <option value="25000-50000">25,000 - 50,000 credits/month</option>
                  <option value="50000-100000">50,000 - 100,000 credits/month</option>
                  <option value="100000+">100,000+ credits/month</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                  placeholder="Tell us about your needs..."
                  rows={4}
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-900 text-white py-3 px-6 rounded-lg font-semibold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Request
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
