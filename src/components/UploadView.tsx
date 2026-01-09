import { useState } from 'react';
import { Upload, FileText, Sparkles, CheckCircle2, TrendingUp } from 'lucide-react';

interface UploadViewProps {
  onAnalysisComplete: (data: any) => void;
}

export function UploadView({ onAnalysisComplete }: UploadViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
        fundingOdds: 68,
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

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : selectedFile
            ? 'border-green-400 bg-green-50'
            : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".pdf,.ppt,.pptx"
          onChange={handleFileSelect}
          disabled={isAnalyzing}
        />

        {selectedFile ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">File Ready for Analysis</h3>
            <p className="text-slate-600 mb-1">{selectedFile.name}</p>
            <p className="text-sm text-slate-500 mb-6">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Analyze Pitch Deck
                  </>
                )}
              </button>
              {!isAnalyzing && (
                <button
                  onClick={() => setSelectedFile(null)}
                  className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Change File
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Upload Your Pitch Deck
            </h3>
            <p className="text-slate-600 mb-6">
              Drag and drop your file here, or click to browse
            </p>
            <label
              htmlFor="file-upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:border-blue-500 hover:text-blue-600 transition-all cursor-pointer"
            >
              <FileText className="w-5 h-5" />
              Choose File
            </label>
            <p className="text-sm text-slate-500 mt-4">
              Supported formats: PDF, PPT, PPTX (Max 50MB)
            </p>
          </div>
        )}
      </div>

      {isAnalyzing && (
        <div className="mt-8 bg-white rounded-xl p-6 border border-slate-200">
          <h4 className="font-semibold text-slate-900 mb-4">Analyzing your pitch deck...</h4>
          <div className="space-y-3">
            {[
              'Extracting content and structure',
              'Analyzing market opportunity and traction',
              'Evaluating team and execution capability',
              'Assessing financial projections',
              'Comparing against successful funding patterns',
              'Generating recommendations'
            ].map((step, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm text-slate-600">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">AI-Powered Analysis</h3>
          <p className="text-sm text-slate-600">
            Advanced algorithms trained on thousands of successful pitch decks and funding outcomes
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-cyan-600" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">VC Perspective</h3>
          <p className="text-sm text-slate-600">
            Get insights from the investor's point of view with industry-standard evaluation metrics
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Actionable Insights</h3>
          <p className="text-sm text-slate-600">
            Receive specific recommendations to improve your deck and increase funding odds
          </p>
        </div>
      </div>
    </div>
  );
}
