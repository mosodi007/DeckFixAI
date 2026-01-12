import { useState, useEffect } from 'react';
import { ArrowLeft, Copy, CheckCircle2, Gift, Users, TrendingUp, Clock, ExternalLink } from 'lucide-react';
import {
  getReferralCode,
  getReferralLink,
  getReferralStats,
  getReferralHistory,
  type ReferralCode,
  type ReferralStats,
  type Referral,
} from '../services/referralService';
import { useCredits } from '../contexts/CreditContext';

interface ReferralViewProps {
  onBack: () => void;
}

export function ReferralView({ onBack }: ReferralViewProps) {
  const { refreshCredits } = useCredits();
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [history, setHistory] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    loadReferralData();
  }, []);

  async function loadReferralData() {
    setLoading(true);
    try {
      const [code, link, referralStats, referralHistory] = await Promise.all([
        getReferralCode(),
        getReferralLink(),
        getReferralStats(),
        getReferralHistory(),
      ]);

      setReferralCode(code);
      setReferralLink(link);
      setStats(referralStats);
      setHistory(referralHistory);
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCopyLink = async () => {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleCopyCode = async () => {
    if (!referralCode?.code) return;

    try {
      await navigator.clipboard.writeText(referralCode.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const getStatusBadge = (status: Referral['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            Completed
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
            Pending
          </span>
        );
      case 'pending_review':
        return (
          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
            Under Review
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
            {status}
          </span>
        );
    }
  };

  const maskEmail = (email?: string) => {
    if (!email) return 'N/A';
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    const maskedLocal = local.length > 2 
      ? `${local[0]}${'*'.repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}`
      : '**';
    return `${maskedLocal}@${domain}`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Earn Free Credits</h1>
            <p className="text-slate-600">Share your referral link and earn 50 credits per referral</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-600">Total Referrals</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.totalReferrals}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-slate-600">Completed</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.completedReferrals}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-slate-600">Credits Earned</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{stats.totalCreditsEarned}</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-slate-600">Remaining</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {stats.remainingReferrals} / {stats.lifetimeLimit}
            </div>
          </div>
        </div>
      )}

      {/* Referral Link Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Your Referral Link</h2>
        <div className="flex items-center gap-3">
          <div className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm break-all">
            {referralLink || 'Loading...'}
          </div>
          <button
            onClick={handleCopyLink}
            className="px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            {copiedLink ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy Link
              </>
            )}
          </button>
        </div>
        <p className="text-sm text-slate-600 mt-3">
          Share this link with your friends. When they sign up and complete their first analysis, you both get 50 credits!
        </p>
      </div>

      {/* Promo Code Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Your Promo Code</h2>
        <div className="flex items-center gap-3">
          <div className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg font-mono text-lg font-bold text-slate-900 text-center">
            {referralCode?.code || 'Loading...'}
          </div>
          <button
            onClick={handleCopyCode}
            className="px-6 py-3 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            {copiedCode ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy Code
              </>
            )}
          </button>
        </div>
        <p className="text-sm text-slate-600 mt-3">
          Your friends can enter this code during signup to get 50 free credits. You'll also get 50 credits when they complete their first analysis.
        </p>
      </div>

      {/* Referral History Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Referral History</h2>
        </div>
        {history.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">No referrals yet</p>
            <p className="text-sm text-slate-500">
              Share your referral link to start earning credits!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Referred User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Signup Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Credits Earned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Completed Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {history.map((referral) => (
                  <tr key={referral.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {maskEmail(referral.referredUserEmail)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">
                        {new Date(referral.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(referral.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">
                        {referral.creditsAwardedReferrer > 0 ? `+${referral.creditsAwardedReferrer}` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">
                        {referral.completedAt
                          ? new Date(referral.completedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Gift className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">How It Works</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Share your referral link or promo code with friends</li>
              <li>When they sign up using your link or code, a referral is created</li>
              <li>After they complete their first pitch deck analysis, you both get 50 credits</li>
              <li>Credits are added to your account automatically</li>
              <li>You can refer up to {stats?.lifetimeLimit || 50} friends (lifetime limit)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

