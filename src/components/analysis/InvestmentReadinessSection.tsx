import { useState } from 'react';
import { Target, Users, TrendingUp, Package, DollarSign, Globe, CheckCircle2, XCircle } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { ProgressBar } from '../ui/ProgressBar';
import { VCCriteriaModal } from './VCCriteriaModal';

interface InvestmentReadiness {
  isInvestmentReady: boolean;
  readinessScore: number;
  readinessSummary: string;
  criticalBlockers: string[];
  scores: {
    team: number;
    marketOpportunity: number;
    product: number;
    traction: number;
    financials: number;
  };
  feedback?: {
    team?: string;
    marketOpportunity?: string;
    product?: string;
    traction?: string;
    financials?: string;
  };
}

interface InvestmentReadinessSectionProps {
  investmentReadiness: InvestmentReadiness | null;
}

function ScoreBar({ label, score, icon: Icon, color, onClick }: { label: string; score: number; icon: any; color: string; onClick: () => void }) {
  return (
    <div className="space-y-2 cursor-pointer hover:bg-slate-50 p-3 rounded-lg transition-colors" onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-sm font-medium text-slate-900">{label}</span>
        </div>
        <span className="text-sm font-bold text-slate-900">{score.toFixed(1)}/10</span>
      </div>
      <ProgressBar value={score} max={10} color={score >= 7 ? 'green' : score >= 5 ? 'yellow' : 'red'} />
    </div>
  );
}

export function InvestmentReadinessSection({ investmentReadiness }: InvestmentReadinessSectionProps) {
  const [selectedCriteria, setSelectedCriteria] = useState<{
    title: string;
    score: number;
    feedback: string;
    icon: any;
    color: string;
  } | null>(null);

  if (!investmentReadiness) {
    return null;
  }

  const { isInvestmentReady, readinessScore, readinessSummary, criticalBlockers, scores, feedback } = investmentReadiness;

  return (
    <GlassCard className={`p-6 mb-8 ${isInvestmentReady ? 'border-2 border-green-200 bg-gradient-to-br from-green-50/30 to-white' : 'border-2 border-orange-200 bg-gradient-to-br from-orange-50/30 to-white'}`}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          {isInvestmentReady ? (
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          ) : (
            <XCircle className="w-7 h-7 text-orange-600" />
          )}
          <div>
            <h3 className="text-xl font-bold text-slate-900">Investor Readiness</h3>
            <p className={`text-sm font-semibold ${isInvestmentReady ? 'text-green-700' : 'text-orange-700'}`}>
              {isInvestmentReady ? 'Ready for investor conversations' : 'Not ready for investors yet'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-slate-900">{readinessScore.toFixed(1)}</div>
          <div className="text-sm text-slate-600">out of 10</div>
        </div>
      </div>

      <div className="mb-6 p-4 bg-white/60 backdrop-blur-md rounded-xl border border-slate-200">
        <h4 className="text-sm font-bold text-slate-900 mb-2">Assessment Summary</h4>
        <p className="text-sm text-slate-700 leading-relaxed">{readinessSummary}</p>
      </div>

      {criticalBlockers && criticalBlockers.length > 0 && (
        <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
          <h4 className="text-sm font-bold text-orange-900 mb-3">Critical Blockers</h4>
          <ul className="space-y-2">
            {criticalBlockers.map((blocker, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-orange-800">
                <XCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <span>{blocker}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-900 mb-3">VC Evaluation Criteria</h4>

        <ScoreBar
          label="Team Strength"
          score={scores.team}
          icon={Users}
          color="text-blue-600"
          onClick={() => setSelectedCriteria({
            title: 'Team Strength',
            score: scores.team,
            feedback: feedback?.team || 'No detailed feedback available.',
            icon: Users,
            color: 'text-blue-600'
          })}
        />

        <ScoreBar
          label="Market Opportunity"
          score={scores.marketOpportunity}
          icon={Globe}
          color="text-green-600"
          onClick={() => setSelectedCriteria({
            title: 'Market Opportunity',
            score: scores.marketOpportunity,
            feedback: feedback?.marketOpportunity || 'No detailed feedback available.',
            icon: Globe,
            color: 'text-green-600'
          })}
        />

        <ScoreBar
          label="Product Quality"
          score={scores.product}
          icon={Package}
          color="text-purple-600"
          onClick={() => setSelectedCriteria({
            title: 'Product Quality',
            score: scores.product,
            feedback: feedback?.product || 'No detailed feedback available.',
            icon: Package,
            color: 'text-purple-600'
          })}
        />

        <ScoreBar
          label="Traction & Validation"
          score={scores.traction}
          icon={TrendingUp}
          color="text-orange-600"
          onClick={() => setSelectedCriteria({
            title: 'Traction & Validation',
            score: scores.traction,
            feedback: feedback?.traction || 'No detailed feedback available.',
            icon: TrendingUp,
            color: 'text-orange-600'
          })}
        />

        <ScoreBar
          label="Financial Strength"
          score={scores.financials}
          icon={DollarSign}
          color="text-emerald-600"
          onClick={() => setSelectedCriteria({
            title: 'Financial Strength',
            score: scores.financials,
            feedback: feedback?.financials || 'No detailed feedback available.',
            icon: DollarSign,
            color: 'text-emerald-600'
          })}
        />
      </div>

      {selectedCriteria && (
        <VCCriteriaModal
          isOpen={true}
          onClose={() => setSelectedCriteria(null)}
          title={selectedCriteria.title}
          score={selectedCriteria.score}
          feedback={selectedCriteria.feedback}
          icon={selectedCriteria.icon}
          color={selectedCriteria.color}
        />
      )}
    </GlassCard>
  );
}
