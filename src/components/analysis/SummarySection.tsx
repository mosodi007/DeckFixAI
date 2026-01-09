import { TrendingUp, Zap, Target, Download, Wand2, Layout, Building2, Globe, DollarSign, Rocket, Users, Sparkles } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { StatCard } from '../ui/StatCard';
import { Button } from '../ui/Button';

interface KeyMetrics {
  industry: string;
  servedMarket: string;
  marketSize: {
    tam: string;
    sam: string;
    som: string;
  };
  traction: string;
  teamSize: number;
}

interface SummarySectionProps {
  fileName: string;
  overallScore: number;
  investmentGrade: string;
  fundingOdds: 'Very High' | 'High' | 'Low' | 'Very Low';
  keyMetrics: KeyMetrics;
}

export function SummarySection({ fileName, overallScore, investmentGrade, fundingOdds, keyMetrics }: SummarySectionProps) {
  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-600';
    if (grade.startsWith('B')) return 'text-blue-600';
    if (grade.startsWith('C')) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getFundingOddsColor = (odds: string) => {
    if (odds === 'Very High') return 'text-green-600';
    if (odds === 'High') return 'text-blue-600';
    if (odds === 'Low') return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <GlassCard className="shadow-xl p-8 mb-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Analysis Complete</h2>
          <p className="text-slate-600">{fileName}</p>
        </div>
        <Button variant="secondary" icon={Download}>
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          label="Overall Score"
          value={overallScore}
          suffix="/10"
          icon={TrendingUp}
        />
        <StatCard
          label="Investment Grade"
          value={investmentGrade}
          icon={Target}
          valueClassName={getGradeColor(investmentGrade)}
        />
        <StatCard
          label="Funding Odds"
          value={fundingOdds}
          icon={Zap}
          valueClassName={getFundingOddsColor(fundingOdds)}
        />
      </div>

      <GlassCard blur="md" className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          Key Metrics Extracted from Pitch Deck
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Industry</p>
              <p className="text-base font-semibold text-slate-900">{keyMetrics.industry}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Globe className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Served Market</p>
              <p className="text-base font-semibold text-slate-900">{keyMetrics.servedMarket}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Market Size</p>
              <p className="text-base font-semibold text-slate-900">
                TAM: {keyMetrics.marketSize.tam}
              </p>
              <p className="text-xs text-slate-600">
                SAM: {keyMetrics.marketSize.sam}, SOM: {keyMetrics.marketSize.som}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Rocket className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Traction</p>
              <p className="text-base font-semibold text-slate-900">{keyMetrics.traction}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-cyan-50 rounded-lg">
              <Users className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Team Size</p>
              <p className="text-base font-semibold text-slate-900">{keyMetrics.teamSize} Members</p>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="flex gap-3">
        <Button variant="primary" icon={Wand2} className="flex-1">
          Fix Issues Automatically
        </Button>
        <Button variant="secondary" icon={Layout} className="flex-1">
          Explore Templates
        </Button>
      </div>
    </GlassCard>
  );
}
