import { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { MetricCard } from '../MetricCard';
import { MetricModal } from '../MetricModal';

interface MetricsSectionProps {
  metrics: {
    contentScore: number;
    clarityScore: number;
    structureScore: number;
    designScore: number;
  };
}

interface MetricBreakdown {
  category: string;
  score: number;
  status: 'good' | 'warning' | 'poor';
  feedback: string;
}

type MetricType = 'content' | 'clarity' | 'structure' | 'design';

export function MetricsSection({ metrics }: MetricsSectionProps) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    metricName: string;
    score: number;
    color: 'blue' | 'cyan' | 'green' | 'purple';
    breakdown: MetricBreakdown[];
  } | null>(null);

  const averageScore = (metrics.contentScore + metrics.clarityScore + metrics.structureScore + metrics.designScore) / 4;

  const getStatus = (score: number): 'good' | 'warning' | 'poor' => {
    if (score >= 7.5) return 'good';
    if (score >= 6.0) return 'warning';
    return 'poor';
  };

  const getContentFeedback = (score: number): MetricBreakdown[] => {
    return [
      {
        category: 'Completeness',
        score: score >= 8 ? 9 : score >= 6.5 ? 7 : 5,
        status: getStatus(score >= 8 ? 9 : score >= 6.5 ? 7 : 5),
        feedback: score >= 8
          ? 'Deck includes all essential slides with comprehensive information.'
          : score >= 6.5
          ? 'Most key information is present, but some sections could be more detailed.'
          : 'Missing critical information or slides. Add more depth to key sections.'
      },
      {
        category: 'Data Quality',
        score: score >= 8 ? 8.5 : score >= 6.5 ? 7 : 5.5,
        status: getStatus(score >= 8 ? 8.5 : score >= 6.5 ? 7 : 5.5),
        feedback: score >= 8
          ? 'Metrics and data points are credible, specific, and well-sourced.'
          : score >= 6.5
          ? 'Data is present but could be more specific or better validated.'
          : 'Lacks concrete metrics or data appears unsubstantiated.'
      },
      {
        category: 'Storytelling',
        score: score >= 8 ? 8 : score >= 6.5 ? 6.5 : 5,
        status: getStatus(score >= 8 ? 8 : score >= 6.5 ? 6.5 : 5),
        feedback: score >= 8
          ? 'Creates a compelling narrative with clear problem-solution-opportunity flow.'
          : score >= 6.5
          ? 'Basic narrative is there but could be more engaging and cohesive.'
          : 'Story is disjointed or unclear. Strengthen the narrative arc.'
      }
    ];
  };

  const getClarityFeedback = (score: number): MetricBreakdown[] => {
    return [
      {
        category: 'Message Clarity',
        score: score >= 8 ? 9 : score >= 6.5 ? 7 : 5,
        status: getStatus(score >= 8 ? 9 : score >= 6.5 ? 7 : 5),
        feedback: score >= 8
          ? 'Value proposition and key messages are crystal clear.'
          : score >= 6.5
          ? 'Main messages are understandable but could be more concise.'
          : 'Messages are unclear or buried. Simplify and highlight key points.'
      },
      {
        category: 'Slide Flow',
        score: score >= 8 ? 8.5 : score >= 6.5 ? 7 : 5.5,
        status: getStatus(score >= 8 ? 8.5 : score >= 6.5 ? 7 : 5.5),
        feedback: score >= 8
          ? 'Each slide flows logically to the next with smooth transitions.'
          : score >= 6.5
          ? 'Generally flows well but some transitions could be smoother.'
          : 'Flow is choppy or hard to follow. Improve slide sequencing.'
      },
      {
        category: 'Ease of Understanding',
        score: score >= 8 ? 8 : score >= 6.5 ? 6.5 : 5,
        status: getStatus(score >= 8 ? 8 : score >= 6.5 ? 6.5 : 5),
        feedback: score >= 8
          ? 'Content is immediately understandable without explanation.'
          : score >= 6.5
          ? 'Generally clear but some slides require closer reading.'
          : 'Too complex or jargon-heavy. Simplify language and concepts.'
      }
    ];
  };

  const getStructureFeedback = (score: number): MetricBreakdown[] => {
    return [
      {
        category: 'Slide Order',
        score: score >= 8 ? 9 : score >= 6.5 ? 7 : 5,
        status: getStatus(score >= 8 ? 9 : score >= 6.5 ? 7 : 5),
        feedback: score >= 8
          ? 'Follows optimal pitch deck structure with logical progression.'
          : score >= 6.5
          ? 'Decent structure but some slides could be better positioned.'
          : 'Structure is unconventional or confusing. Reorder for better flow.'
      },
      {
        category: 'Narrative Pacing',
        score: score >= 8 ? 8.5 : score >= 6.5 ? 7 : 5.5,
        status: getStatus(score >= 8 ? 8.5 : score >= 6.5 ? 7 : 5.5),
        feedback: score >= 8
          ? 'Perfect pacing - builds momentum and maintains engagement.'
          : score >= 6.5
          ? 'Pacing is acceptable but some sections feel rushed or slow.'
          : 'Uneven pacing disrupts the narrative. Balance information density.'
      },
      {
        category: 'Organization',
        score: score >= 8 ? 8 : score >= 6.5 ? 6.5 : 5,
        status: getStatus(score >= 8 ? 8 : score >= 6.5 ? 6.5 : 5),
        feedback: score >= 8
          ? 'Information is well-organized with clear hierarchies.'
          : score >= 6.5
          ? 'Mostly organized but some sections could be cleaner.'
          : 'Disorganized or cluttered. Improve information hierarchy.'
      }
    ];
  };

  const getDesignFeedback = (score: number): MetricBreakdown[] => {
    return [
      {
        category: 'Visual Quality',
        score: score >= 8 ? 9 : score >= 6.5 ? 7 : 5,
        status: getStatus(score >= 8 ? 9 : score >= 6.5 ? 7 : 5),
        feedback: score >= 8
          ? 'Professional, modern design that enhances credibility.'
          : score >= 6.5
          ? 'Visually acceptable but could be more polished.'
          : 'Design looks amateurish or dated. Invest in better visuals.'
      },
      {
        category: 'Consistency',
        score: score >= 8 ? 8.5 : score >= 6.5 ? 7 : 5.5,
        status: getStatus(score >= 8 ? 8.5 : score >= 6.5 ? 7 : 5.5),
        feedback: score >= 8
          ? 'Consistent fonts, colors, and styling throughout.'
          : score >= 6.5
          ? 'Mostly consistent with minor variations in style.'
          : 'Inconsistent design elements. Unify fonts, colors, and layouts.'
      },
      {
        category: 'Professionalism',
        score: score >= 8 ? 8 : score >= 6.5 ? 6.5 : 5,
        status: getStatus(score >= 8 ? 8 : score >= 6.5 ? 6.5 : 5),
        feedback: score >= 8
          ? 'Looks investor-ready with attention to detail.'
          : score >= 6.5
          ? 'Professional enough but lacks polish in some areas.'
          : 'Unprofessional appearance may hurt credibility.'
      }
    ];
  };

  const openModal = (metricType: MetricType) => {
    let name = '';
    let score = 0;
    let color: 'blue' | 'cyan' | 'green' | 'purple' = 'blue';
    let breakdown: MetricBreakdown[] = [];

    switch (metricType) {
      case 'content':
        name = 'Content Score';
        score = metrics.contentScore;
        color = 'blue';
        breakdown = getContentFeedback(score);
        break;
      case 'clarity':
        name = 'Clarity Score';
        score = metrics.clarityScore;
        color = 'green';
        breakdown = getClarityFeedback(score);
        break;
      case 'structure':
        name = 'Structure Score';
        score = metrics.structureScore;
        color = 'cyan';
        breakdown = getStructureFeedback(score);
        break;
      case 'design':
        name = 'Design Score';
        score = metrics.designScore;
        color = 'purple';
        breakdown = getDesignFeedback(score);
        break;
    }

    setModalState({ isOpen: true, metricName: name, score, color, breakdown });
  };

  const closeModal = () => {
    setModalState(null);
  };

  return (
    <>
      <GlassCard className="p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-4">Performance Metrics</h3>
        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Scoring Context:</span> 5.0-6.5 = Average | 7.0+ = Good | 8.0+ = Excellent
          </p>
        </div>
        {/* <div className="grid grid-cols-2 gap-4">
          <MetricCard
            label="Content Score"
            value={metrics.contentScore}
            max={10}
            color="blue"
            onClick={() => openModal('content')}
          />
          <MetricCard
            label="Clarity Score"
            value={metrics.clarityScore}
            max={10}
            color="green"
            onClick={() => openModal('clarity')}
          />
          <MetricCard
            label="Structure Score"
            value={metrics.structureScore}
            max={10}
            color="cyan"
            onClick={() => openModal('structure')}
          />
          <MetricCard
            label="Design Score"
            value={metrics.designScore}
            max={10}
            color="purple"
            onClick={() => openModal('design')}
          />
        </div> */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">Average Score</span>
            <span className="text-lg font-bold text-slate-900">{averageScore.toFixed(1)}/10</span>
          </div>
        </div>
      </GlassCard>

      {modalState && (
        <MetricModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          metricName={modalState.metricName}
          score={modalState.score}
          max={10}
          color={modalState.color}
          breakdown={modalState.breakdown}
        />
      )}
    </>
  );
}
