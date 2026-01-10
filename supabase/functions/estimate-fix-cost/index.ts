import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Issue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

interface SlideContent {
  text: string;
  issues: Issue[];
}

interface ComplexityBreakdown {
  issueCountScore: number;
  severityScore: number;
  contentLengthScore: number;
  fixScopeScore: number;
  totalScore: number;
}

interface ComplexityResult {
  complexityScore: number;
  creditCost: number;
  complexityLevel: 'low' | 'medium' | 'high';
  breakdown: ComplexityBreakdown;
  explanation: string;
}

const MIN_CREDITS = 2;
const MAX_CREDITS = 10;

const COMPLEXITY_WEIGHTS = {
  issueCount: 0.3,
  severity: 0.3,
  contentLength: 0.2,
  fixScope: 0.2,
};

const COST_MAPPING: Record<string, number> = {
  '0-20': 2,
  '21-35': 3,
  '36-50': 4,
  '51-65': 6,
  '66-80': 8,
  '81-100': 10,
};

function calculateIssueCountScore(issueCount: number): number {
  if (issueCount === 1) return 10;
  if (issueCount >= 2 && issueCount <= 3) return 25;
  if (issueCount >= 4 && issueCount <= 5) return 50;
  return 80;
}

function calculateSeverityScore(issues: Issue[]): number {
  if (issues.length === 0) return 0;

  const severityPoints: Record<string, number> = {
    low: 5,
    medium: 15,
    high: 30,
    critical: 50,
  };

  const totalSeverity = issues.reduce((sum, issue) => {
    return sum + (severityPoints[issue.severity] || 5);
  }, 0);

  const avgSeverity = totalSeverity / issues.length;
  return Math.min(avgSeverity, 50);
}

function calculateContentLengthScore(text: string): number {
  const wordCount = text.trim().split(/\s+/).length;

  if (wordCount <= 50) return 5;
  if (wordCount <= 100) return 15;
  if (wordCount <= 200) return 30;
  return 50;
}

function calculateFixScopeScore(issues: Issue[], text: string): number {
  const issueCount = issues.length;
  const wordCount = text.trim().split(/\s+/).length;

  const hasCriticalIssues = issues.some(i => i.severity === 'critical');
  const hasHighIssues = issues.some(i => i.severity === 'high');
  const hasStructuralIssues = issues.some(i =>
    i.type.includes('structure') ||
    i.type.includes('logic') ||
    i.type.includes('flow')
  );

  if (hasCriticalIssues || (hasHighIssues && issueCount >= 4) || hasStructuralIssues) {
    return 60;
  }

  if (issueCount >= 3 && wordCount > 100) {
    return 30;
  }

  return 10;
}

function mapScoreToCreditCost(score: number): number {
  if (score <= 20) return COST_MAPPING['0-20'];
  if (score <= 35) return COST_MAPPING['21-35'];
  if (score <= 50) return COST_MAPPING['36-50'];
  if (score <= 65) return COST_MAPPING['51-65'];
  if (score <= 80) return COST_MAPPING['66-80'];
  return COST_MAPPING['81-100'];
}

function getComplexityLevel(score: number): 'low' | 'medium' | 'high' {
  if (score <= 35) return 'low';
  if (score <= 65) return 'medium';
  return 'high';
}

function generateExplanation(breakdown: ComplexityBreakdown, issues: Issue[], text: string): string {
  const parts: string[] = [];
  const issueCount = issues.length;
  const wordCount = text.trim().split(/\s+/).length;

  if (issueCount === 1) {
    parts.push('1 issue to fix');
  } else {
    parts.push(`${issueCount} issues to fix`);
  }

  const hasCritical = issues.some(i => i.severity === 'critical');
  const hasHigh = issues.some(i => i.severity === 'high');

  if (hasCritical) {
    parts.push('critical severity');
  } else if (hasHigh) {
    parts.push('high severity');
  } else if (issues.some(i => i.severity === 'medium')) {
    parts.push('medium severity');
  } else {
    parts.push('low severity');
  }

  if (wordCount > 200) {
    parts.push('long content');
  } else if (wordCount > 100) {
    parts.push('moderate content');
  }

  if (breakdown.fixScopeScore >= 60) {
    parts.push('major rewrite needed');
  } else if (breakdown.fixScopeScore >= 30) {
    parts.push('moderate changes');
  }

  return parts.join(', ');
}

function analyzeSlideComplexity(slideContent: SlideContent): ComplexityResult {
  const { text, issues } = slideContent;

  const issueCountScore = calculateIssueCountScore(issues.length);
  const severityScore = calculateSeverityScore(issues);
  const contentLengthScore = calculateContentLengthScore(text);
  const fixScopeScore = calculateFixScopeScore(issues, text);

  const totalScore = Math.min(
    Math.round(
      issueCountScore * COMPLEXITY_WEIGHTS.issueCount +
      severityScore * COMPLEXITY_WEIGHTS.severity +
      contentLengthScore * COMPLEXITY_WEIGHTS.contentLength +
      fixScopeScore * COMPLEXITY_WEIGHTS.fixScope
    ),
    100
  );

  const breakdown: ComplexityBreakdown = {
    issueCountScore,
    severityScore,
    contentLengthScore,
    fixScopeScore,
    totalScore,
  };

  const creditCost = Math.max(MIN_CREDITS, Math.min(MAX_CREDITS, mapScoreToCreditCost(totalScore)));
  const complexityLevel = getComplexityLevel(totalScore);
  const explanation = generateExplanation(breakdown, issues, text);

  return {
    complexityScore: totalScore,
    creditCost,
    complexityLevel,
    breakdown,
    explanation,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const requestData = await req.json();
    const { slideContent, slideFeedback, slideRecommendations } = requestData;

    const issues: Issue[] = [];

    if (slideFeedback) {
      const feedbackLines = slideFeedback.split('\n').filter((line: string) => line.trim());
      feedbackLines.forEach((line: string) => {
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        if (line.toLowerCase().includes('critical') || line.toLowerCase().includes('major')) {
          severity = 'critical';
        } else if (line.toLowerCase().includes('important') || line.toLowerCase().includes('significant')) {
          severity = 'high';
        } else if (line.toLowerCase().includes('minor')) {
          severity = 'low';
        }

        issues.push({
          type: 'feedback',
          severity,
          description: line,
        });
      });
    }

    if (slideRecommendations && Array.isArray(slideRecommendations)) {
      slideRecommendations.forEach((rec: string) => {
        issues.push({
          type: 'recommendation',
          severity: 'medium',
          description: rec,
        });
      });
    }

    if (issues.length === 0) {
      issues.push({
        type: 'improvement',
        severity: 'low',
        description: 'General improvement needed',
      });
    }

    const result = analyzeSlideComplexity({
      text: slideContent || '',
      issues,
    });

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error estimating fix cost:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to estimate fix cost',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
