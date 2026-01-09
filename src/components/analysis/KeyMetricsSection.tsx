import { Building2, Briefcase, DollarSign, Target, TrendingUp, Users, Globe } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface KeyMetricsSectionProps {
  company: string;
  industry: string;
  currentRevenue: string;
  fundingSought: string;
  growthRate: string;
  teamSize: number;
  marketSize: string;
}

export function KeyMetricsSection({
  company,
  industry,
  currentRevenue,
  fundingSought,
  growthRate,
  teamSize,
  marketSize,
}: KeyMetricsSectionProps) {
  return (
    <GlassCard className="shadow-xl mb-8">
      <h3 className="text-2xl font-bold text-slate-900 mb-6">Key Metrics</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 rounded-xl">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Company</p>
            <p className="text-lg font-semibold text-slate-900">{company}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-3 bg-cyan-50 rounded-xl">
            <Briefcase className="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Industry</p>
            <p className="text-lg font-semibold text-slate-900">{industry}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-50 rounded-xl">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Current Revenue</p>
            <p className="text-lg font-semibold text-slate-900">{currentRevenue}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-50 rounded-xl">
            <Target className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Funding Sought</p>
            <p className="text-lg font-semibold text-slate-900">{fundingSought}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-50 rounded-xl">
            <TrendingUp className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Growth Rate</p>
            <p className="text-lg font-semibold text-slate-900">{growthRate}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-3 bg-pink-50 rounded-xl">
            <Users className="w-6 h-6 text-pink-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Team Size</p>
            <p className="text-lg font-semibold text-slate-900">{teamSize} Members</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Globe className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 mb-1">Market Size</p>
            <p className="text-lg font-semibold text-slate-900">{marketSize}</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
