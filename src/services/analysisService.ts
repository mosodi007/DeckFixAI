import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface AnalysisData {
  id: string;
  fileName: string;
  fileSize: number;
  overallScore: number;
  totalPages: number;
  summary: string;
  createdAt: string;
  pages: Array<{
    pageNumber: number;
    title: string;
    score: number;
    content: string | null;
  }>;
  metrics: {
    clarityScore: number;
    designScore: number;
    contentScore: number;
    structureScore: number;
    strengths: string[];
    weaknesses: string[];
  };
  issues: Array<{
    id: string;
    pageNumber: number | null;
    priority: string;
    title: string;
    description: string;
    type: 'issue' | 'improvement';
  }>;
  missingSlides: Array<{
    id: string;
    priority: string;
    title: string;
    description: string;
    suggestedContent: string;
  }>;
}

export async function analyzeDeck(file: File): Promise<{ analysisId: string }> {
  const formData = new FormData();
  formData.append('file', file);

  console.log('Uploading file:', file.name, 'Size:', file.size);

  const response = await fetch(
    `${supabaseUrl}/functions/v1/analyze-deck`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: formData,
    }
  );

  console.log('Response status:', response.status);

  if (!response.ok) {
    let errorMessage = 'Failed to analyze deck';
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
      console.error('Error from API:', error);
    } catch (e) {
      const text = await response.text();
      console.error('Error response text:', text);
      errorMessage = text || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  console.log('Analysis result:', result);
  return { analysisId: result.analysisId };
}

export async function getAnalysis(analysisId: string): Promise<AnalysisData> {
  const { data: analysis, error: analysisError } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .single();

  if (analysisError) throw analysisError;

  const { data: pages, error: pagesError } = await supabase
    .from('analysis_pages')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('page_number');

  if (pagesError) throw pagesError;

  const { data: metrics, error: metricsError } = await supabase
    .from('analysis_metrics')
    .select('*')
    .eq('analysis_id', analysisId)
    .maybeSingle();

  if (metricsError) throw metricsError;

  const { data: issues, error: issuesError } = await supabase
    .from('analysis_issues')
    .select('*')
    .eq('analysis_id', analysisId);

  if (issuesError) throw issuesError;

  const { data: missingSlides, error: missingError } = await supabase
    .from('missing_slides')
    .select('*')
    .eq('analysis_id', analysisId);

  if (missingError) throw missingError;

  return {
    id: analysis.id,
    fileName: analysis.file_name,
    fileSize: analysis.file_size,
    overallScore: analysis.overall_score,
    totalPages: analysis.total_pages,
    summary: analysis.summary,
    createdAt: analysis.created_at,
    pages: pages?.map((p: any) => ({
      pageNumber: p.page_number,
      title: p.title,
      score: p.score,
      content: p.content,
    })) || [],
    metrics: {
      clarityScore: metrics?.clarity_score || 0,
      designScore: metrics?.design_score || 0,
      contentScore: metrics?.content_score || 0,
      structureScore: metrics?.structure_score || 0,
      strengths: metrics?.strengths || [],
      weaknesses: metrics?.weaknesses || [],
    },
    issues: issues?.map((i: any) => ({
      id: i.id,
      pageNumber: i.page_number,
      priority: i.priority,
      title: i.title,
      description: i.description,
      type: i.type,
    })) || [],
    missingSlides: missingSlides?.map((s: any) => ({
      id: s.id,
      priority: s.priority,
      title: s.title,
      description: s.description,
      suggestedContent: s.suggested_content,
    })) || [],
  };
}
