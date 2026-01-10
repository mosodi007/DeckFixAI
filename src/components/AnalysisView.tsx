import { useState, useEffect, useRef } from 'react';
import { Wand2 } from 'lucide-react';
import { SummarySection } from './analysis/SummarySection';
import { GeneralReviewSection } from './analysis/GeneralReviewSection';
// import { KeyMetricsSection } from './analysis/KeyMetricsSection';
import { StageAssessmentSection } from './analysis/StageAssessmentSection';
import { InvestmentReadinessSection } from './analysis/InvestmentReadinessSection';
import { DealBreakersSection } from './analysis/DealBreakersSection';
import { RedFlagsSection } from './analysis/RedFlagsSection';
import { MissingPagesSection } from './analysis/MissingPagesSection';
import { MetricsSection } from './analysis/MetricsSection';
import { StrengthsSection } from './analysis/StrengthsSection';
import { IssuesSection } from './analysis/IssuesSection';
import { ImprovementsSection } from './analysis/ImprovementsSection';

interface AnalysisViewProps {
  data: any;
  onNewAnalysis: () => void;
  onOpenImprovementFlow: () => void;
  isAuthenticated: boolean;
  onSignUpClick: () => void;
}

const sections = [
  { id: 'summary', label: 'Summary' },
  { id: 'metrics-scores', label: 'Performance Metrics' },
  { id: 'general-review', label: 'General Review' },
  // { id: 'key-metrics', label: 'Business Information' },
  { id: 'stage-assessment', label: 'Stage Assessment' },
  { id: 'investment-readiness', label: 'Investor Readiness' },
  { id: 'deal-breakers', label: 'Deal Breakers' },
  { id: 'red-flags', label: 'Red Flags' },
  // { id: 'missing-pages', label: 'Missing Pages' },
  { id: 'strengths-issues', label: 'Strengths & Issues' },
  { id: 'improvements', label: 'Improvements' },
];

export function AnalysisView({ data, onNewAnalysis, onOpenImprovementFlow, isAuthenticated, onSignUpClick }: AnalysisViewProps) {
  const [activeSection, setActiveSection] = useState('summary');
  const navRef = useRef<HTMLElement>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.2, rootMargin: '-130px 0px -50% 0px' }
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  // Auto-scroll navigation menu when active section changes
  useEffect(() => {
    const activeButton = buttonRefs.current[activeSection];
    if (activeButton && navRef.current) {
      const nav = navRef.current;
      const buttonLeft = activeButton.offsetLeft;
      const buttonWidth = activeButton.offsetWidth;
      const navWidth = nav.offsetWidth;
      const navScrollLeft = nav.scrollLeft;

      // Calculate the center position
      const targetScroll = buttonLeft - navWidth / 2 + buttonWidth / 2;

      nav.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
    }
  }, [activeSection]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 130;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8">
      {/* Navigation Menu */}
      <div className="sticky top-16 z-40 bg-white border-b border-slate-200 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 mb-8">
        <nav ref={navRef} className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
          {sections.map((section) => (
            <button
              key={section.id}
              ref={(el) => (buttonRefs.current[section.id] = el)}
              onClick={() => scrollToSection(section.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeSection === section.id
                  ? 'bg-[#000] text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      <div id="summary">
        <SummarySection
        fileName={data.fileName}
        companyName={data.keyMetrics.companyName}
        overallScore={data.overallScore}
        investmentGrade={data.investmentGrade}
        fundingOdds={data.fundingOdds}
        businessSummary={data.businessSummary}
        totalPages={data.totalPages}
        wordDensity={data.wordDensity}
        criticalIssuesCount={data.criticalIssuesCount}
        overallScoreFeedback={data.overallScoreFeedback}
        investmentGradeFeedback={data.investmentGradeFeedback}
        fundingOddsFeedback={data.fundingOddsFeedback}
        wordDensityFeedback={data.wordDensityFeedback}
        criticalIssuesFeedback={data.criticalIssuesFeedback}
        pageCountFeedback={data.pageCountFeedback}
      />
      </div>

      <div id="metrics-scores" className="mb-8">
        <MetricsSection metrics={data.metrics} />
      </div>

      <div id="general-review">
        <GeneralReviewSection
          overallScore={data.overallScore}
          investmentGrade={data.investmentGrade}
          dealBreakersCount={data.dealBreakers?.length || 0}
          redFlagsCount={data.redFlags?.length || 0}
          investmentReady={data.investmentReady}
          strengths={data.strengths || []}
          issues={data.issues || []}
        />
      </div>

      {/* <div id="key-metrics">
        <KeyMetricsSection
          company={data.keyMetrics.companyName}
          industry={data.keyMetrics.industry}
          currentRevenue={data.keyMetrics.currentRevenue}
          fundingSought={data.keyMetrics.fundingSought}
          growthRate={data.keyMetrics.growthRate}
          teamSize={data.keyMetrics.teamSize}
          marketSize={data.keyMetrics.marketSize}
          valuation={data.keyMetrics.valuation}
          businessModel={data.keyMetrics.businessModel}
          customerCount={data.keyMetrics.customerCount}
        />
      </div> */}

      <div id="stage-assessment">
        <StageAssessmentSection
          stageAssessment={data.stageAssessment}
          fundingStage={data.fundingStage}
        />
      </div>

      <div id="investment-readiness">
        <InvestmentReadinessSection investmentReadiness={data.investmentReadiness} />
      </div>

      <div id="deal-breakers">
        <DealBreakersSection
          dealBreakers={data.dealBreakers || []}
          isAuthenticated={isAuthenticated}
          onSignUpClick={onSignUpClick}
        />
      </div>

      <div id="red-flags">
        <RedFlagsSection
          redFlags={data.redFlags || []}
          isAuthenticated={isAuthenticated}
          onSignUpClick={onSignUpClick}
        />
      </div>

      {/* <div id="missing-pages">
        <MissingPagesSection missingSlides={data.missingSlides || []} />
      </div> */}

      <div id="strengths-issues" className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <StrengthsSection
          strengths={data.strengths}
          isAuthenticated={isAuthenticated}
          onSignUpClick={onSignUpClick}
        />
        <IssuesSection
          issues={data.issues}
          isAuthenticated={isAuthenticated}
          onSignUpClick={onSignUpClick}
        />
      </div>

      <div id="improvements">
        <ImprovementsSection
          improvements={data.improvements}
          onOpenImprovementFlow={onOpenImprovementFlow}
          isAuthenticated={isAuthenticated}
          onSignUpClick={onSignUpClick}
        />
      </div>

      {/* Floating Fix All Issues Button */}
      <button
        onClick={onOpenImprovementFlow}
        className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#000] hover:bg-slate-800 text-white pl-6 pr-7 py-4 rounded-full shadow-2xl flex items-center gap-3 font-semibold transition-all hover:scale-105 hover:shadow-3xl z-50 group"
      >
        <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        <span>Fix All Issues</span>
      </button>
    </div>
  );
}
