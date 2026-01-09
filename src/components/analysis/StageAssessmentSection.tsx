import { Rocket, Target, CheckCircle, AlertCircle } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface StageAssessment {
  detectedStage: string;
  stageConfidence: string;
  stageAppropriatenessScore: number;
  stageFeedback: string;
}

interface StageAssessmentSectionProps {
  stageAssessment: StageAssessment | null;
  fundingStage: string | null;
}

function getStageIcon(stage: string) {
  return Rocket;
}

function getStageColor(stage: string): string {
  switch (stage) {
    case 'Pre-Seed':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Seed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Series A':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Series B+':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

function getConfidenceColor(confidence: string): string {
  switch (confidence) {
    case 'high':
      return 'text-green-700';
    case 'medium':
      return 'text-yellow-700';
    case 'low':
      return 'text-orange-700';
    default:
      return 'text-slate-700';
  }
}

export function StageAssessmentSection({ stageAssessment, fundingStage }: StageAssessmentSectionProps) {
  if (!stageAssessment && !fundingStage) {
    return null;
  }

  const stage = stageAssessment?.detectedStage || fundingStage || 'Unknown';
  const confidence = stageAssessment?.stageConfidence || 'medium';
  const appropriatenessScore = stageAssessment?.stageAppropriatenessScore || 0;
  const feedback = stageAssessment?.stageFeedback || '';

  const StageIcon = getStageIcon(stage);
  const isAppropriate = appropriatenessScore >= 7;

  return (
    <GlassCard className="p-6 mb-8">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <StageIcon className="w-6 h-6 text-slate-700" />
          <div>
            <h3 className="text-xl font-bold text-slate-900">Funding Stage Assessment</h3>
            <p className="text-sm text-slate-600">Stage-specific evaluation and guidance</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/60 backdrop-blur-md rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
            Detected Stage
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold ${getStageColor(stage)}`}>
            <Target className="w-4 h-4" />
            {stage}
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-md rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
            Confidence Level
          </div>
          <div className={`text-lg font-bold capitalize ${getConfidenceColor(confidence)}`}>
            {confidence}
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-md rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
            Stage Appropriateness
          </div>
          <div className="flex items-center gap-2">
            <div className="text-lg font-bold text-slate-900">
              {appropriatenessScore.toFixed(1)}/10
            </div>
            {isAppropriate ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-orange-600" />
            )}
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border ${isAppropriate ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
          <h4 className={`text-sm font-bold mb-2 ${isAppropriate ? 'text-green-900' : 'text-orange-900'}`}>
            Stage-Specific Feedback
          </h4>
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isAppropriate ? 'text-green-800' : 'text-orange-800'}`}>
            {feedback}
          </p>
        </div>
      )}
    </GlassCard>
  );
}
