import { useState, useRef } from 'react';
import { Sparkles, CheckCircle2, TrendingUp } from 'lucide-react';
import { UploadZone } from './upload/UploadZone';
import { AnalysisProgress } from './upload/AnalysisProgress';
import { FeatureCard } from './upload/FeatureCard';

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

    setTimeout(() => {
      const mockAnalysis = {
        fileName: selectedFile.name,
        uploadDate: new Date().toISOString(),
        overallScore: 7.8,
        investmentGrade: 'B+',
        fundingOdds: 'High',
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
            impact: 'Investors need clear visibility into profitability metrics'
          },
          {
            priority: 'High',
            issue: 'Include competitive analysis matrix',
            impact: 'Better positioning against competitors strengthens investment case'
          },
          {
            priority: 'Medium',
            issue: 'Expand on team credentials',
            impact: 'Highlight relevant industry experience and past exits'
          },
          {
            priority: 'Medium',
            issue: 'Refine financial projections',
            impact: 'More conservative projections increase credibility'
          }
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
