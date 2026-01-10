import { useState, useEffect, useRef } from 'react';
import { FileText, TrendingUp, AlertCircle, Calendar, ChevronRight, Upload, Trash2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/analysisService';
import { ScoreCircle } from './ScoreCircle';
import { analyzeDeck } from '../services/analysisService';
import { extractPageImages } from '../services/pdfImageExtractor';
import { uploadPageImages, deleteAnalysisImages, getCoverImageUrl } from '../services/storageService';
import { v4 as uuidv4 } from 'uuid';

interface DeckAnalysis {
  id: string;
  deck_name: string;
  overall_score: number;
  total_pages: number;
  created_at: string;
  status: 'completed' | 'processing' | 'failed';
  key_strengths?: string[];
  critical_issues_count?: number;
}

interface DashboardViewProps {
  onViewAnalysis: (analysisId: string) => void;
  onNewUpload: () => void;
}

export function DashboardView({ onViewAnalysis, onNewUpload }: DashboardViewProps) {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<DeckAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAnalyses();
  }, [user]);

  async function loadAnalyses() {
    try {
      setLoading(true);

      let query = supabase
        .from('analyses')
        .select(`
          id,
          file_name,
          overall_score,
          total_pages,
          created_at
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const formattedAnalyses: DeckAnalysis[] = (data || []).map(item => ({
        id: item.id,
        deck_name: item.file_name || 'Untitled Deck',
        overall_score: item.overall_score || 0,
        total_pages: item.total_pages || 0,
        created_at: item.created_at,
        status: 'completed',
        critical_issues_count: 0,
      }));

      setAnalyses(formattedAnalyses);
    } catch (error) {
      console.error('Error loading analyses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(analysisId: string, deckName: string) {
    if (!confirm(`Are you sure you want to delete "${deckName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(analysisId);

      await deleteAnalysisImages(analysisId);

      const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('id', analysisId);

      if (error) throw error;

      setAnalyses(prev => prev.filter(a => a.id !== analysisId));
    } catch (error) {
      console.error('Error deleting analysis:', error);
      alert('Failed to delete analysis. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      handleUpload(file);
    } else {
      alert('Please select a PDF file');
    }
  }

  function handleChooseFile() {
    fileInputRef.current?.click();
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadProgress(0);

    try {
      const analysisId = uuidv4();

      setUploadProgress(10);

      const images = await extractPageImages(file, (progress) => {
        const extractionProgress = 10 + (progress.currentPage / progress.totalPages) * 30;
        setUploadProgress(Math.round(extractionProgress));
      });

      setUploadProgress(40);

      const imageUrls = await uploadPageImages(images, analysisId, (progress) => {
        const uploadProgress = 40 + (progress.currentPage / progress.totalPages) * 20;
        setUploadProgress(Math.round(uploadProgress));
      });

      setUploadProgress(60);

      await analyzeDeck(file, analysisId, imageUrls);

      setUploadProgress(100);

      setTimeout(() => {
        onViewAnalysis(analysisId);
      }, 500);
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(error.message || 'Failed to analyze deck. Please try again.');
      setSelectedFile(null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  function getScoreColor(score: number) {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  }

  function getScoreBgColor(score: number) {
    if (score >= 80) return 'bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'bg-blue-50 border-blue-200';
    if (score >= 40) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading your pitch decks...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header */}
        {analyses.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">
                  My Pitch Decks
                </h1>
                <p className="text-lg text-slate-600">
                  {`${analyses.length} ${analyses.length === 1 ? 'deck' : 'decks'} analyzed`}
                </p>
              </div>
              <button
                onClick={onNewUpload}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all hover:shadow-lg hover:scale-105"
              >
                <Upload className="w-5 h-5" />
                Upload New Deck
              </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 rounded-xl">
                    <FileText className="w-6 h-6 text-slate-700" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-slate-900">
                      {analyses.length}
                    </div>
                    <div className="text-sm text-slate-600">Total Decks</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-slate-900">
                      {Math.round(analyses.reduce((sum, a) => sum + a.overall_score, 0) / analyses.length)}
                    </div>
                    <div className="text-sm text-slate-600">Average Score</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Calendar className="w-6 h-6 text-blue-700" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-slate-900">
                      {analyses.filter(a => {
                        const diffDays = Math.floor((Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24));
                        return diffDays < 7;
                      }).length}
                    </div>
                    <div className="text-sm text-slate-600">This Week</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deck List */}
        {analyses.length === 0 ? (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-7xl font-semibold text-slate-900 mb-4 tracking-tighter">
                Make your Pitch Deck Investor-Ready in Minutes.
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Receive professional AI analysis based on industry VC standards and patterns from thousands of successfully funded startups.
              </p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden mb-12">
              <div className="p-12">
                <div className="bg-gradient-to-br from-slate-50 to-white border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-slate-400 transition-all">
                  <div className="w-24 h-24 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Upload className="w-12 h-12 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-3">
                    Upload Your Pitch Deck
                  </h3>

                  <p className="text-slate-600 mb-8 max-w-md mx-auto">
                    {uploading
                      ? 'Analyzing your deck with AI...'
                      : 'Upload your PDF pitch deck to receive comprehensive analysis and improvement suggestions'}
                  </p>

                  {uploading ? (
                    <div className="max-w-md mx-auto">
                      <div className="flex items-center justify-between mb-2 text-sm">
                        <span className="text-slate-600">Analyzing...</span>
                        <span className="text-slate-900 font-semibold">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-slate-900 transition-all duration-500 ease-out rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-slate-500 mt-4">
                        This may take 30-60 seconds depending on deck size
                      </p>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <button
                        onClick={handleChooseFile}
                        className="inline-flex items-center gap-3 px-10 py-4 bg-slate-900 text-white text-lg font-semibold rounded-xl hover:bg-slate-800 transition-all hover:shadow-xl hover:scale-105"
                      >
                        <Upload className="w-6 h-6" />
                        Choose File
                      </button>
                      <p className="text-sm text-slate-500 mt-4">
                        PDF files only, max 50MB
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-12 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center">
                    <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Sparkles className="w-7 h-7 text-slate-700" />
                    </div>
                    <h4 className="font-semibold text-slate-900 mb-2">AI-Powered Analysis</h4>
                    <p className="text-sm text-slate-600">
                      Advanced algorithms trained on thousands of successful pitch decks and funding outcomes
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <TrendingUp className="w-7 h-7 text-slate-700" />
                    </div>
                    <h4 className="font-semibold text-slate-900 mb-2">VC Perspective</h4>
                    <p className="text-sm text-slate-600">
                      Get insights from the investor's point of view with industry-standard evaluation metrics
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                      <CheckCircle2 className="w-7 h-7 text-slate-700" />
                    </div>
                    <h4 className="font-semibold text-slate-900 mb-2">Actionable Insights</h4>
                    <p className="text-sm text-slate-600">
                      Receive specific recommendations to improve your deck and increase funding odds
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {analyses.map((analysis) => (
              <div
                key={analysis.id}
                className="group bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all duration-300 overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Cover Image */}
                  <div className="sm:w-48 sm:h-64 h-48 flex-shrink-0 bg-slate-100 relative overflow-hidden">
                    <img
                      src={getCoverImageUrl(analysis.id)}
                      alt={`${analysis.deck_name} cover`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-slate-100"><svg class="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>';
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-slate-900 mb-2 truncate group-hover:text-slate-700 transition-colors">
                          {analysis.deck_name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(analysis.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {analysis.total_pages} slides
                          </span>
                        </div>
                      </div>

                      <div className="ml-4 flex-shrink-0">
                        <div className="relative">
                          <ScoreCircle score={analysis.overall_score} size="md" />
                        </div>
                      </div>
                    </div>

                    {/* Score Badge */}
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border mb-4 ${getScoreBgColor(analysis.overall_score)}`}>
                      <span className={`text-sm font-semibold ${getScoreColor(analysis.overall_score)}`}>
                        {analysis.overall_score >= 80 && 'Investment Ready'}
                        {analysis.overall_score >= 60 && analysis.overall_score < 80 && 'Strong Foundation'}
                        {analysis.overall_score >= 40 && analysis.overall_score < 60 && 'Needs Improvement'}
                        {analysis.overall_score < 40 && 'Major Issues'}
                      </span>
                    </div>

                    {/* Quick Stats */}
                    {analysis.critical_issues_count !== undefined && analysis.critical_issues_count > 0 && (
                      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-4">
                        <AlertCircle className="w-4 h-4" />
                        <span>{analysis.critical_issues_count} critical {analysis.critical_issues_count === 1 ? 'issue' : 'issues'} found</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-auto">
                      <button
                        onClick={() => onViewAnalysis(analysis.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all hover:shadow-md group-hover:scale-[1.02]"
                      >
                        View Analysis
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(analysis.id, analysis.deck_name)}
                        disabled={deletingId === analysis.id}
                        className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                        title="Delete analysis"
                      >
                        {deletingId === analysis.id ? (
                          <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
