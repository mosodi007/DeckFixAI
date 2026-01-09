import { Building2, Briefcase, DollarSign, Target, TrendingUp, Users, Globe, BadgeDollarSign, Sparkles, UsersRound } from 'lucide-react';

interface KeyMetricsSectionProps {
  company: string;
  industry: string;
  currentRevenue: string;
  fundingSought: string;
  growthRate: string;
  teamSize: number;
  marketSize: string;
  valuation?: string;
  businessModel?: string;
  customerCount?: string;
}

interface MetricItemProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
}

function MetricItem({ icon: Icon, label, value }: MetricItemProps) {
  return (
    <div className="group relative">
      <div className="relative bg-white/60 backdrop-blur-xl rounded-2xl border border-slate-200/60 p-6 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3.5 rounded-xl border border-slate-200/60">
            <Icon className="w-6 h-6 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
              {label}
            </p>
            <p className="text-lg font-bold text-slate-900 truncate">
              {value}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function KeyMetricsSection({
  company,
  industry,
  currentRevenue,
  fundingSought,
  growthRate,
  teamSize,
  marketSize,
  valuation,
  businessModel,
  customerCount,
}: KeyMetricsSectionProps) {
  const metrics = [
    { icon: Building2, label: "Company", value: company },
    { icon: Briefcase, label: "Industry", value: industry },
    { icon: DollarSign, label: "Current Revenue", value: currentRevenue },
    { icon: Target, label: "Funding Sought", value: fundingSought },
    { icon: TrendingUp, label: "Growth Rate", value: growthRate },
    { icon: Users, label: "Team Size", value: teamSize > 0 ? `${teamSize} Members` : 'Not specified' },
    { icon: Globe, label: "Market Size", value: marketSize },
  ];

  if (valuation && valuation !== 'Not specified') {
    metrics.push({ icon: BadgeDollarSign, label: "Valuation", value: valuation });
  }

  if (businessModel && businessModel !== 'Not specified') {
    metrics.push({ icon: Sparkles, label: "Business Model", value: businessModel });
  }

  if (customerCount && customerCount !== 'Not specified') {
    metrics.push({ icon: UsersRound, label: "Customers", value: customerCount });
  }

  return (
    <div className="relative mb-8">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 to-slate-50/30 rounded-xl blur-2xl" />
      <div className="relative bg-white/50 backdrop-blur-2xl rounded-xl border border-slate-200/60 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-1 w-12 bg-gradient-to-r from-slate-400 to-slate-200 rounded-full" />
          <h3 className="text-2xl font-bold text-slate-900">
            Key Metrics
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {metrics.map((metric, index) => (
            <MetricItem
              key={index}
              icon={metric.icon}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
