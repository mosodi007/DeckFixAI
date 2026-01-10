import { useState, useEffect } from 'react';
import { FileText, TrendingUp, AlertCircle, Calendar, ChevronRight, Upload, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/analysisService';
import { ScoreCircle } from './ScoreCircle';

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
          deck_name,
          overall_score,
          total_pages,
          created_at,
          general_strengths,
          critical_issues_count
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const formattedAnalyses: DeckAnalysis[] = (data || []).map(item => ({
        id: item.id,
        deck_name: item.deck_name || 'Untitled Deck',
        overall_score: item.overall_score || 0,
        total_pages: item.total_pages || 0,
        created_at: item.created_at,
        status: 'completed',
        key_strengths: item.general_strengths,
        critical_issues_count: item.critical_issues_count || 0,
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
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                My Pitch Decks
              </h1>
              <p className="text-lg text-slate-600">
                {analyses.length === 0
                  ? 'Upload your first pitch deck to get started'
                  : `${analyses.length} ${analyses.length === 1 ? 'deck' : 'decks'} analyzed`}
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
          {analyses.length > 0 && (
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
          )}
        </div>

        {/* Deck List */}
        {analyses.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                No pitch decks yet
              </h3>
              <p className="text-slate-600 mb-8">
                Upload your first pitch deck to get instant AI-powered analysis and feedback from a VC perspective.
              </p>
              <button
                onClick={onNewUpload}
                className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all hover:shadow-lg hover:scale-105"
              >
                <Upload className="w-5 h-5" />
                Upload Your First Deck
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {analyses.map((analysis) => (
              <div
                key={analysis.id}
                className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all duration-300"
              >
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
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
