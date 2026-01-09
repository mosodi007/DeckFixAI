import { useState, useRef } from 'react';
import { Sparkles, CheckCircle2, TrendingUp } from 'lucide-react';
import { UploadZone } from './upload/UploadZone';
import { AnalysisProgress } from './upload/AnalysisProgress';
import { FeatureCard } from './upload/FeatureCard';
import { analyzeDeck } from '../services/analysisService';

interface UploadViewProps {
  onAnalysisComplete: (data: any) => void;
}

export function UploadView({ onAnalysisComplete }: UploadViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);

    try {
      const { analysisId } = await analyzeDeck(selectedFile);
      onAnalysisComplete({ analysisId });
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Failed to analyze deck. Please try again.');
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeOld = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);

    setTimeout(() => {
      const mockAnalysis = {
        fileName: selectedFile.name,
        uploadDate: new Date().toISOString(),
        overallScore: 7.8,
        investmentGrade: 'B+',
        fundingOdds: 'High',
        keyMetrics: {
          company: 'PayFlow Technologies',
          industry: 'Fintech',
          currentRevenue: '$3.2M ARR',
          fundingSought: '$5M Series A',
          growthRate: '25% MoM',
          teamSize: 12,
          marketSize: '$5B TAM'
        },
        metrics: {
          tractionScore: 8.2,
          disruptionScore: 7.5,
          deckQuality: 8.0,
          marketSize: 7.8,
          teamStrength: 7.2,
          financialProjections: 6.9
        },
        strengths: [
          'Strong revenue growth trajectory with 3x YoY increase',
          'Clear competitive advantages and defensible moat',
          'Experienced founding team with proven track record',
          'Large addressable market with clear expansion path',
          'Well-articulated value proposition'
        ],
        issues: [
          'Customer acquisition costs trending higher than industry average',
          'Limited details on go-to-market strategy for international expansion',
          'Financial projections lack detailed assumptions',
          'Cap table and previous funding rounds not clearly presented',
          'Missing key metrics: LTV, churn rate, burn rate'
        ],
        improvements: [
          {
            priority: 'High',
            issue: 'Add detailed unit economics slide',
            impact: 'Investors need clear visibility into profitability metrics',
            pageNumber: 8
          },
          {
            priority: 'High',
            issue: 'Include competitive analysis matrix',
            impact: 'Better positioning against competitors strengthens investment case',
            pageNumber: 5
          },
          {
            priority: 'High',
            issue: 'Strengthen value proposition clarity',
            impact: 'Make the unique selling points more prominent and compelling',
            pageNumber: 2
          },
          {
            priority: 'Medium',
            issue: 'Expand on team credentials',
            impact: 'Highlight relevant industry experience and past exits',
            pageNumber: 9
          },
          {
            priority: 'Medium',
            issue: 'Refine financial projections',
            impact: 'More conservative projections increase credibility',
            pageNumber: 10
          },
          {
            priority: 'Medium',
            issue: 'Add customer testimonials',
            impact: 'Social proof builds investor confidence in product-market fit',
            pageNumber: 6
          },
          {
            priority: 'Low',
            issue: 'Update market sizing methodology',
            impact: 'Use bottom-up approach to validate TAM calculations',
            pageNumber: 4
          },
          {
            priority: 'Low',
            issue: 'Improve slide design consistency',
            impact: 'Professional visual consistency enhances credibility',
            pageNumber: 1
          }
        ],
        missingSlides: [
          {
            priority: 'High',
            title: 'Unit Economics & Key Metrics',
            description: 'Your deck is missing critical financial metrics. Investors need to see CAC, LTV, gross margins, and payback period to assess business viability.',
            suggestedContent: 'CAC, LTV, LTV/CAC ratio, Gross Margin, Payback Period'
          },
          {
            priority: 'High',
            title: 'Competitive Advantage & Moat',
            description: 'No clear differentiation from competitors. Add a slide showing your unique advantages, barriers to entry, and defensible positioning.',
            suggestedContent: 'Competitive matrix, unique IP, network effects, switching costs'
          },
          {
            priority: 'Medium',
            title: 'Customer Case Studies',
            description: 'Missing social proof and validation. Include 2-3 customer success stories or testimonials to demonstrate product-market fit.',
            suggestedContent: 'Customer logos, testimonials, results achieved, retention metrics'
          },
          {
            priority: 'Medium',
            title: 'Use of Funds Breakdown',
            description: 'Funding ask needs detailed allocation plan. Show exactly how investment will be deployed across hiring, product, marketing, etc.',
            suggestedContent: 'Budget breakdown, hiring plan, milestones, runway extension'
          },
          {
            priority: 'Low',
            title: 'Risk Analysis & Mitigation',
            description: 'Demonstrate awareness of key risks and your strategies to address them. Shows maturity and thorough planning.',
            suggestedContent: 'Market risks, competitive risks, execution risks, mitigation strategies'
          }
        ],
        pages: [
          { pageNumber: 1, title: 'Cover Slide', score: 85, thumbnail: null },
          { pageNumber: 2, title: 'Problem Statement', score: 78, thumbnail: null },
          { pageNumber: 3, title: 'Solution Overview', score: 82, thumbnail: null },
          { pageNumber: 4, title: 'Market Opportunity', score: 72, thumbnail: null },
          { pageNumber: 5, title: 'Competitive Landscape', score: 65, thumbnail: null },
          { pageNumber: 6, title: 'Product Demo', score: 88, thumbnail: null },
          { pageNumber: 7, title: 'Business Model', score: 80, thumbnail: null },
          { pageNumber: 8, title: 'Traction & Metrics', score: 68, thumbnail: null },
          { pageNumber: 9, title: 'Team', score: 75, thumbnail: null },
          { pageNumber: 10, title: 'Financial Projections', score: 62, thumbnail: null },
          { pageNumber: 11, title: 'Go-to-Market Strategy', score: 70, thumbnail: null },
          { pageNumber: 12, title: 'Funding Ask', score: 90, thumbnail: null }
        ]
      };

      onAnalysisComplete(mockAnalysis);
      setIsAnalyzing(false);
    }, 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-slate-900 mb-4">
          Analyze and Fix your PitchDeck with AI - In Seconds
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Upload your pitch deck and receive professional investment analysis based on industry standards
          and patterns from thousands of successfully funded startups.
        </p>
      </div>

      <UploadZone
        isDragging={isDragging}
        selectedFile={selectedFile}
        isAnalyzing={isAnalyzing}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileSelect={handleFileSelect}
        onAnalyze={handleAnalyze}
        onClearFile={() => setSelectedFile(null)}
        fileInputRef={fileInputRef}
      />

      {isAnalyzing && <AnalysisProgress />}

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard
          icon={Sparkles}
          title="AI-Powered Analysis"
          description="Advanced algorithms trained on thousands of successful pitch decks and funding outcomes"
        />
        <FeatureCard
          icon={TrendingUp}
          title="VC Perspective"
          description="Get insights from the investor's point of view with industry-standard evaluation metrics"
        />
        <FeatureCard
          icon={CheckCircle2}
          title="Actionable Insights"
          description="Receive specific recommendations to improve your deck and increase funding odds"
          iconColor="border-green-200"
        />
      </div>
    </div>
  );
}
