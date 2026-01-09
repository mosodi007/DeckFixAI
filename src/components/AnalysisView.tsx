import { useState } from 'react';
import {
  TrendingUp,
  Zap,
  Target,
  AlertCircle,
  CheckCircle2,
  Download,
  Wand2,
  Layout,
  ArrowRight
} from 'lucide-react';
import { MetricCard } from './MetricCard';
import { ScoreCircle } from './ScoreCircle';
import { MetricModal } from './MetricModal';

interface AnalysisViewProps {
  data: any;
  onNewAnalysis: () => void;
}

type MetricType = 'traction' | 'disruption' | 'deckQuality' | 'marketSize' | 'teamStrength' | 'financials' | null;

export function AnalysisView({ data }: AnalysisViewProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(null);

  const metricBreakdowns = {
    traction: [
      { category: 'User Growth', score: 8, status: 'good' as const, feedback: 'Strong month-over-month growth rate of 25%' },
      { category: 'Revenue Metrics', score: 7, status: 'good' as const, feedback: 'Solid revenue trajectory with clear monetization' },
      { category: 'Engagement', score: 6, status: 'warning' as const, feedback: 'Good engagement but could improve retention metrics' },
      { category: 'Market Validation', score: 7, status: 'good' as const, feedback: 'Strong early customer testimonials and case studies' },
    ],
    disruption: [
      { category: 'Innovation Level', score: 9, status: 'good' as const, feedback: 'Novel approach to solving existing problem' },
      { category: 'Competitive Advantage', score: 7, status: 'good' as const, feedback: 'Clear differentiation from competitors' },
      { category: 'Market Timing', score: 8, status: 'good' as const, feedback: 'Excellent timing with current market trends' },
      { category: 'Scalability', score: 6, status: 'warning' as const, feedback: 'Good scalability potential but needs validation' },
    ],
    deckQuality: [
      { category: 'Visual Design', score: 7, status: 'good' as const, feedback: 'Professional and clean design aesthetic' },
      { category: 'Story Flow', score: 6, status: 'warning' as const, feedback: 'Good narrative but transitions could be smoother' },
      { category: 'Data Presentation', score: 8, status: 'good' as const, feedback: 'Well-structured data with clear visualizations' },
      { category: 'Clarity', score: 7, status: 'good' as const, feedback: 'Message is clear but some slides are dense' },
    ],
    marketSize: [
      { category: 'TAM Analysis', score: 8, status: 'good' as const, feedback: 'Well-researched total addressable market' },
      { category: 'Market Growth', score: 7, status: 'good' as const, feedback: 'Strong growth trajectory in target market' },
      { category: 'Market Access', score: 6, status: 'warning' as const, feedback: 'Path to market needs more detail' },
      { category: 'Market Validation', score: 7, status: 'good' as const, feedback: 'Good evidence of market demand' },
    ],
    teamStrength: [
      { category: 'Relevant Experience', score: 6, status: 'warning' as const, feedback: 'Team has good experience but could highlight domain expertise more' },
      { category: 'Track Record', score: 7, status: 'good' as const, feedback: 'Solid previous achievements and exits' },
      { category: 'Team Completeness', score: 5, status: 'warning' as const, feedback: 'Core team is strong but missing key technical roles' },
      { category: 'Advisor Network', score: 8, status: 'good' as const, feedback: 'Impressive roster of advisors and mentors' },
    ],
    financials: [
      { category: 'Revenue Model', score: 7, status: 'good' as const, feedback: 'Clear and validated revenue streams' },
      { category: 'Financial Projections', score: 6, status: 'warning' as const, feedback: 'Projections are ambitious but could use more supporting data' },
      { category: 'Unit Economics', score: 8, status: 'good' as const, feedback: 'Strong unit economics with clear path to profitability' },
      { category: 'Burn Rate', score: 7, status: 'good' as const, feedback: 'Reasonable burn rate with sufficient runway' },
    ],
  };

  const metricConfig = {
    traction: { name: 'Traction Score', value: data.metrics.tractionScore, color: 'blue' as const },
    disruption: { name: 'Disruption Signal', value: data.metrics.disruptionScore, color: 'cyan' as const },
    deckQuality: { name: 'Deck Quality', value: data.metrics.deckQuality, color: 'green' as const },
    marketSize: { name: 'Market Size', value: data.metrics.marketSize, color: 'purple' as const },
    teamStrength: { name: 'Team Strength', value: data.metrics.teamStrength, color: 'orange' as const },
    financials: { name: 'Financials', value: data.metrics.financialProjections, color: 'pink' as const },
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-600';
    if (grade.startsWith('B')) return 'text-blue-600';
    if (grade.startsWith('C')) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'High') return 'bg-red-100 text-red-700 border-red-200';
    if (priority === 'Medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Analysis Complete</h2>
            <p className="text-slate-600">{data.fileName}</p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-300 text-slate-700 font-medium rounded-lg hover:border-blue-500 hover:text-blue-600 transition-all">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Overall Score</span>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900">{data.overallScore}</span>
              <span className="text-lg text-slate-600">/10</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Investment Grade</span>
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div className={`text-4xl font-bold ${getGradeColor(data.investmentGrade)}`}>
              {data.investmentGrade}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Funding Odds</span>
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900">{data.fundingOdds}%</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl">
            <Wand2 className="w-5 h-5" />
            Fix Issues Automatically
          </button>
          <button className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:border-blue-500 hover:text-blue-600 transition-all">
            <Layout className="w-5 h-5" />
            Explore Templates
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Key Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              label="Traction Score"
              value={data.metrics.tractionScore}
              max={10}
              color="blue"
              onClick={() => setSelectedMetric('traction')}
            />
            <MetricCard
              label="Disruption Signal"
              value={data.metrics.disruptionScore}
              max={10}
              color="cyan"
              onClick={() => setSelectedMetric('disruption')}
            />
            <MetricCard
              label="Deck Quality"
              value={data.metrics.deckQuality}
              max={10}
              color="green"
              onClick={() => setSelectedMetric('deckQuality')}
            />
            <MetricCard
              label="Market Size"
              value={data.metrics.marketSize}
              max={10}
              color="purple"
              onClick={() => setSelectedMetric('marketSize')}
            />
            <MetricCard
              label="Team Strength"
              value={data.metrics.teamStrength}
              max={10}
              color="orange"
              onClick={() => setSelectedMetric('teamStrength')}
            />
            <MetricCard
              label="Financials"
              value={data.metrics.financialProjections}
              max={10}
              color="pink"
              onClick={() => setSelectedMetric('financials')}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Score Distribution</h3>
          <div className="flex items-center justify-center h-64">
            <ScoreCircle score={data.overallScore * 10} size={200} />
          </div>
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 text-center">
              Your pitch deck scores in the <span className="font-semibold text-slate-900">top 32%</span> of analyzed decks.
              With recommended improvements, you could reach the <span className="font-semibold text-slate-900">top 15%</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <h3 className="text-xl font-bold text-slate-900">Key Strengths</h3>
          </div>
          <ul className="space-y-3">
            {data.strengths.map((strength: string, index: number) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle className="w-6 h-6 text-orange-600" />
            <h3 className="text-xl font-bold text-slate-900">Key Issues to Address</h3>
          </div>
          <ul className="space-y-3">
            {data.issues.map((issue: string, index: number) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-700">{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-6">Priority Improvements</h3>
        <div className="space-y-4">
          {data.improvements.map((improvement: any, index: number) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
            >
              <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(improvement.priority)}`}>
                {improvement.priority}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-1">{improvement.issue}</h4>
                <p className="text-sm text-slate-600">{improvement.impact}</p>
              </div>
              <button className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedMetric && (
        <MetricModal
          isOpen={true}
          onClose={() => setSelectedMetric(null)}
          metricName={metricConfig[selectedMetric].name}
          score={metricConfig[selectedMetric].value}
          max={10}
          color={metricConfig[selectedMetric].color}
          breakdown={metricBreakdowns[selectedMetric]}
        />
      )}
    </div>
  );
}
