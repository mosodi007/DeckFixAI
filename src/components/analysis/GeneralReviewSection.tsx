import { FileText } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface GeneralReviewSectionProps {
  overallScore: number;
  investmentGrade: string;
  dealBreakersCount: number;
  redFlagsCount: number;
  investmentReady: boolean;
  strengths: string[];
  issues: string[];
}

export function GeneralReviewSection({
  overallScore,
  investmentGrade,
  dealBreakersCount,
  redFlagsCount,
  investmentReady,
  strengths,
  issues
}: GeneralReviewSectionProps) {
  const generateReview = (): string => {
    const scoreValue = overallScore * 10;
    const isExcellent = scoreValue >= 80;
    const isGood = scoreValue >= 70;
    const isAverage = scoreValue >= 55;

    let review = '';

    if (dealBreakersCount === 0 && isExcellent) {
      review = `This is an exceptional pitch deck that demonstrates a deep understanding of investor expectations. ${
        strengths.length > 0
          ? `The deck excels in multiple areas including ${strengths.slice(0, 2).join(' and ').toLowerCase()}.`
          : 'The founders have done an excellent job presenting their vision, product, and market opportunity.'
      } `;
    } else if (dealBreakersCount === 0 && isGood) {
      review = `This is a strong pitch deck with solid fundamentals. ${
        strengths.length > 0
          ? `Key strengths include ${strengths.slice(0, 2).join(' and ').toLowerCase()}.`
          : 'The core narrative and market opportunity are well-articulated.'
      } `;
    } else if (dealBreakersCount === 0 && isAverage) {
      review = `This pitch deck shows promise but needs refinement before approaching investors. ${
        strengths.length > 0
          ? `While there are some positive elements like ${strengths[0].toLowerCase()}, `
          : 'While the basic structure is in place, '
      }the deck requires additional work to meet institutional investor standards. `;
    } else if (dealBreakersCount > 0) {
      review = `This pitch deck has ${dealBreakersCount} critical deal-breaker${dealBreakersCount > 1 ? 's' : ''} that must be addressed before approaching investors. These fundamental issues make the deck uninvestable in its current state. `;
    } else {
      review = 'This pitch deck needs significant improvements across multiple dimensions before it can be considered investment-ready. ';
    }

    if (redFlagsCount > 0) {
      review += `There ${redFlagsCount === 1 ? 'is' : 'are'} ${redFlagsCount} red flag${redFlagsCount > 1 ? 's' : ''} that could raise concerns with investors. `;
    }

    if (issues.length > 0 && dealBreakersCount === 0) {
      const topIssues = issues.slice(0, 2);
      if (topIssues.length === 1) {
        review += `The primary area for improvement is ${topIssues[0].toLowerCase()}. `;
      } else if (topIssues.length === 2) {
        review += `Key areas for improvement include ${topIssues[0].toLowerCase()} and ${topIssues[1].toLowerCase()}. `;
      }
    }

    if (investmentReady && isGood) {
      review += 'The deck is investment-ready and suitable for investor presentations. ';
    } else if (investmentReady && isAverage) {
      review += 'While technically investment-ready, additional polish would significantly strengthen your position. ';
    } else if (!investmentReady && isAverage) {
      review += 'Address the identified issues to reach investment-ready status. ';
    } else if (!investmentReady && !isAverage) {
      review += 'Significant work is needed before this deck is suitable for investor presentations. ';
    }

    if (isExcellent && dealBreakersCount === 0) {
      review += 'This deck demonstrates strong execution and attention to detail that will resonate with investors.';
    } else if (isGood && dealBreakersCount === 0) {
      review += 'With minor refinements, this deck will be well-positioned for fundraising success.';
    } else if (isAverage) {
      review += 'Focus on the high-priority improvements to maximize your chances of securing funding.';
    } else if (dealBreakersCount > 0) {
      review += 'Priority should be given to resolving the deal-breakers before making any other changes.';
    } else {
      review += 'Consider working with a pitch deck consultant or advisor to strengthen the overall presentation.';
    }

    return review;
  };

  return (
    <GlassCard className="p-6 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">General Review</h3>
      </div>
      <div className="prose prose-slate max-w-none">
        <p className="text-slate-700 leading-relaxed">
          {generateReview()}
        </p>
      </div>
    </GlassCard>
  );
}
